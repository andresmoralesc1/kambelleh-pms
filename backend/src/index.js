import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load env
dotenv.config();

import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import reservationRoutes from './routes/reservations.js';
import guestRoutes from './routes/guests.js';
import paymentRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import { errorHandler } from './middleware/errorHandler.js';
import stripeWebhook from './routes/stripeWebhook.js';

const app = express();
const server = createServer(app);

// Trust proxy (for rate limiting behind nginx)
app.set('trust proxy', 1);

// ================== MIDDLEWARE ==================

// Stripe webhook needs raw body - must be before express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ================== ROUTES ==================

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ================== ERROR HANDLER ==================

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🔥 Kambelleh PMS API running on port ${PORT}`);
});