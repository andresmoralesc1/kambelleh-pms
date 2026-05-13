import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env
dotenv.config();

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import roomRoutes from './routes/rooms.js';
import reservationRoutes from './routes/reservations.js';
import guestRoutes from './routes/guests.js';
import paymentRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import exportsRoutes from './routes/exports.js';
import internalNotesRoutes from './routes/internalNotes.js';
import channelManagerRoutes from './routes/channelManager.js';
import cleaningRoutes from './routes/cleaning.js';
import activityLogRoutes from './routes/activityLog.js';
import { errorHandler } from './middleware/errorHandler.js';
import stripeWebhook from './routes/stripeWebhook.js';
import publicRoutes from './routes/public.js';
import cronRoutes from './routes/cron.js';

const app = express();
const server = createServer(app);

// Trust proxy (for rate limiting behind nginx)
app.set('trust proxy', 1);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Make io available to routes via req.app.get('io')
app.set('io', io);

// Socket.IO authentication middleware — reads the same accessToken cookie as HTTP
io.use((socket, next) => {
  const cookies = {};
  const cookieHeader = socket.handshake.headers.cookie || '';
  cookieHeader.split(';').forEach(c => {
    const [name, ...vals] = c.split('=');
    if (name) cookies[name.trim()] = vals.join('=').trim();
  });

  const token = cookies.accessToken;
  if (!token) {
    return next(new Error('No autenticado'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('La sesión ha expirado'));
    }
    return next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Socket.IO conectado: usuario ${socket.user.userId}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Socket.IO desconectado: usuario ${socket.user.userId}`);
  });
});

// ================== MIDDLEWARE ==================

// Stripe webhook needs raw body — must be before express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());

// Rate limiting — global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Rate limiting — auth endpoints (stricter: 10 attempts / 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/public', authLimiter);

// ================== ROUTES ==================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/notes', internalNotesRoutes);
app.use('/api/channels', channelManagerRoutes);
app.use('/api/cleaning', cleaningRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/cron', cronRoutes);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(__dirname, '../public')));
  app.get('*', (_, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// ================== ERROR HANDLER ==================

app.use(errorHandler);

// ================== SERVER START ==================

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🔥 Kambelleh PMS API running on port ${PORT}`);

  // Schedule reservation reminders — every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      const { default: prisma } = await import('./config/database.js');
      const { startOfDay, endOfDay, addDays } = await import('date-fns');
      const { sendCheckinReminder, sendCheckoutReminder } = await import('./services/email.js');

      const now = new Date();
      const tomorrow = addDays(startOfDay(now), 1);
      const tomorrowStart = startOfDay(tomorrow);
      const tomorrowEnd = endOfDay(tomorrow);
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      // Check-in reminders for tomorrow
      const checkinDue = await prisma.reservation.findMany({
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          checkIn: { gte: tomorrowStart, lte: tomorrowEnd },
          reminderCheckedInSentAt: null,
        },
        include: { guest: true, room: true },
      });

      // Check-out reminders for today
      const checkoutDue = await prisma.reservation.findMany({
        where: {
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          checkOut: { gte: todayStart, lte: todayEnd },
          reminderCheckedOutSentAt: null,
        },
        include: { guest: true, room: true },
      });

      // Early checkout alerts — rooms checking out tomorrow (for housekeeping)
      const tomorrowCheckout = await prisma.reservation.findMany({
        where: {
          status: 'CHECKED_IN',
          checkOut: { gte: tomorrowStart, lte: tomorrowEnd },
        },
        include: { guest: true, room: true },
      });

      if (tomorrowCheckout.length > 0) {
        console.log(`[cron] Housekeeping alerts: ${tomorrowCheckout.length} early checkouts tomorrow`);
      }

      // Fire reminders
      await Promise.allSettled(
        checkinDue.map(async (reservation) => {
          try {
            await sendCheckinReminder(reservation.guest, reservation, reservation.room);
            await prisma.reservation.update({ where: { id: reservation.id }, data: { reminderCheckedInSentAt: now } });
          } catch (e) { /* fire-and-forget */ }
        })
      );

      await Promise.allSettled(
        checkoutDue.map(async (reservation) => {
          try {
            await sendCheckoutReminder(reservation.guest, reservation, reservation.room);
            await prisma.reservation.update({ where: { id: reservation.id }, data: { reminderCheckedOutSentAt: now } });
          } catch (e) { /* fire-and-forget */ }
        })
      );

      if (checkinDue.length > 0 || checkoutDue.length > 0) {
        console.log(`[cron] Reminders: ${checkinDue.length} check-in, ${checkoutDue.length} check-out`);
      }
    } catch (err) {
      console.error('[cron] Error sending reservation reminders:', err.message);
    }
  });
  console.log('[cron] Reservation reminder scheduler started (runs hourly)');
});

// Graceful shutdown — drain connections before exiting
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  io.close(() => {
    console.log('Socket.IO server closed.');
  });
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('Database connections closed.');
    } catch (err) {
      console.error('Error closing DB connections:', err);
    }
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced exit after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
