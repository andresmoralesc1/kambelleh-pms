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
import prisma from './config/database.js';

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
import { csrfMiddleware } from './middleware/csrf.js';
import { connectRedis } from './config/redis.js';

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

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
// CORS: allow multiple origins (comma-separated in FRONTEND_URL env var)
function parseAllowedOrigins() {
  const env = process.env.FRONTEND_URL || 'http://localhost:5173';
  const origins = env.split(',').map(o => o.trim());

  // Reject wildcards in production — they introduce security risk
  // because cookies would be sent to any subdomain matching the pattern
  if (process.env.NODE_ENV === 'production') {
    for (const origin of origins) {
      if (origin.includes('*')) {
        console.error(`[CORS] Bloqueo: FRONTEND_URL contiene wildcard '${origin}' — esto expondría credenciales a subdominios no esperados. Usar dominios exactos en producción.`);
        process.exit(1);
      }
      // Validate it looks like a real domain (has TLD, no suspicious patterns)
      if (!origin.includes('.') || origin.startsWith('.')) {
        console.error(`[CORS] Bloqueo: FRONTEND_URL '${origin}' no parece un dominio válido en producción.`);
        process.exit(1);
      }
    }
  }

  return origins;
}

const allowedOrigins = parseAllowedOrigins();
app.use(cors({
  origin: allowedOrigins.length > 1 ? allowedOrigins : allowedOrigins[0],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());

// CSRF protection for state-changing requests (applied after auth middleware per-route)
// The csrfMiddleware checks req.user so it must run after authenticate middleware on each route
// Global application order: json -> rate limit -> auth -> csrf -> routes

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

// Rate limiting — public availability endpoint (prevent enumeration/DoS)
const availabilityLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 checks per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas consultas de disponibilidad. Intenta de nuevo en un minuto.' },
});
app.use('/api/public/rooms/availability', availabilityLimiter);

// ================== ROUTES ==================

// Wrap routes with CSRF middleware - runs after authenticate per-route
// since authenticate is called inside each route handler
app.use('/api/auth', csrfMiddleware, authRoutes);
app.use('/api/users', csrfMiddleware, userRoutes);
app.use('/api/rooms', csrfMiddleware, roomRoutes);
app.use('/api/reservations', csrfMiddleware, reservationRoutes);
app.use('/api/guests', csrfMiddleware, guestRoutes);
app.use('/api/payments', csrfMiddleware, paymentRoutes);
app.use('/api/dashboard', csrfMiddleware, dashboardRoutes);
app.use('/api/exports', csrfMiddleware, exportsRoutes);
app.use('/api/notes', csrfMiddleware, internalNotesRoutes);
app.use('/api/channels', csrfMiddleware, channelManagerRoutes);
app.use('/api/cleaning', csrfMiddleware, cleaningRoutes);
app.use('/api/activity-logs', csrfMiddleware, activityLogRoutes);
app.use('/api/public', csrfMiddleware, publicRoutes);
app.use('/api/cron', csrfMiddleware, cronRoutes);

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

server.listen(PORT, async () => {
  console.log(`🔥 Kambelleh PMS API running on port ${PORT}`);

  // Connect to Redis (non-blocking — app works without it)
  connectRedis().catch(err => {
    console.warn('[redis] Initial connection failed:', err.message);
  });

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
    try {
      await disconnectRedis();
      console.log('Redis connection closed.');
    } catch (err) {
      console.error('Error closing Redis connection:', err);
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
