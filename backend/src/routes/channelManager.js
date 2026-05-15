import express from 'express';
import crypto from 'crypto';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import airbnbService from '../services/airbnbService.js';
import bookingService from '../services/bookingService.js';
import googleCalendarService from '../services/googleCalendarService.js';
import getRedis from '../config/redis.js';

const AIRBNB_STATE_KEY = 'channels:airbnb:state';
const router = express.Router();

async function getAirbnbState() {
  try {
    const redis = getRedis();
    const raw = await redis.get(AIRBNB_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Default state if Redis unavailable
  return {
    connected: false,
    lastSync: null,
    mockMode: process.env.AIRBNB_MOCK === 'true',
  };
}

async function setAirbnbState(state) {
  try {
    const redis = getRedis();
    await redis.set(AIRBNB_STATE_KEY, JSON.stringify(state), 'EX', 86400);
  } catch {}
}

// Helper para obtener estado de Booking desde BD
async function getBookingChannelStatus() {
  const isMock = process.env.BOOKING_MOCK === 'true';
  const channel = await prisma.channelConnection.findFirst({
    where: { channel: 'BOOKING' }
  });
  const connected = isMock || (channel?.isActive || false);
  return {
    connected,
    lastSync: channel?.lastSync || null,
    mockMode: isMock,
    credentialsConfigured: !!(process.env.BOOKING_USERNAME && process.env.BOOKING_PASSWORD && process.env.BOOKING_HOTEL_ID),
  };
}

// GET /api/channels/airbnb/status
router.get('/airbnb/status', authenticate, authorize('ADMIN'), async (req, res) => {
  const isMock = process.env.AIRBNB_MOCK === 'true';
  const connected = isMock || airbnbService.isConnected();
  const state = await getAirbnbState();

  res.json({
    connected,
    lastSync: state.lastSync,
    mockMode: isMock,
    credentialsConfigured: !!(process.env.AIRBNB_CLIENT_ID && process.env.AIRBNB_CLIENT_SECRET),
  });
});

// POST /api/channels/airbnb/connect
router.post('/airbnb/connect', authenticate, authorize('ADMIN'), async (req, res) => {
  const isMock = process.env.AIRBNB_MOCK === 'true';

  if (isMock) {
    const state = { connected: true, lastSync: null, mockMode: true };
    await setAirbnbState(state);
    res.json({
      success: true,
      message: 'Conectado en modo demo',
      mockMode: true,
    });
    return;
  }

  const { AIRBNB_CLIENT_ID, AIRBNB_CLIENT_SECRET } = process.env;

  if (!AIRBNB_CLIENT_ID || !AIRBNB_CLIENT_SECRET) {
    return res.status(400).json({
      error: 'Credenciales de Airbnb no configuradas. Configure AIRBNB_CLIENT_ID y AIRBNB_CLIENT_SECRET en el archivo .env'
    });
  }

  const authUrlData = airbnbService.getAuthorizationUrl();
  if (!authUrlData) {
    return res.status(500).json({ error: 'Error al generar URL de autorización' });
  }

  // Persist CSRF state in DB (survives restarts, works with multiple instances)
  await prisma.oAuthState.create({
    data: {
      state: authUrlData.state,
      channel: 'AIRBNB',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min TTL
    },
  });

  res.json({ authUrl: authUrlData.url, state: authUrlData.state });
});

// POST /api/channels/airbnb/disconnect
router.post('/airbnb/disconnect', authenticate, authorize('ADMIN'), async (req, res) => {
  const isMock = process.env.AIRBNB_MOCK === 'true';

  airbnbService.disconnect();
  const state = { connected: false, lastSync: null, mockMode: isMock };
  await setAirbnbState(state);

  res.json({
    success: true,
    message: isMock ? 'Desconectado del modo demo' : 'Desconectado de Airbnb'
  });
});

// POST /api/channels/airbnb/sync
router.post('/airbnb/sync', authenticate, authorize('ADMIN'), async (req, res) => {
  const isMock = process.env.AIRBNB_MOCK === 'true';

  try {
    if (isMock) {
      // En modo mock, generar reservas de ejemplo
      const mockReservations = airbnbService.generateMockReservations();
      const results = await airbnbService.importReservations(mockReservations);
      await setAirbnbState({ ...await getAirbnbState(), lastSync: new Date().toISOString() });

      return res.json({
        success: true,
        message: `Sincronizadas ${results.created + results.updated} reservas en modo demo`,
        reservationsImported: results.created + results.updated,
        mockMode: true,
        details: results,
      });
    }

    if (!airbnbService.isConnected()) {
      return res.status(400).json({
        error: 'No conectado a Airbnb. Use POST /connect primero.'
      });
    }

    const results = await airbnbService.syncAllReservations();
    await setAirbnbState({ ...await getAirbnbState(), lastSync: new Date().toISOString() });

    res.json({
      success: true,
      reservationsImported: results.created + results.updated,
      details: results,
    });
  } catch (err) {
    console.error('Airbnb sync error:', err.message);
    res.status(500).json({
      error: 'Error al sincronizar con Airbnb',
      details: err.message
    });
  }
});

// POST /api/channels/airbnb/webhook
router.post('/airbnb/webhook', async (req, res) => {
  const signature = req.headers['x-airbnb-signature'];
  const webhookSecret = process.env.AIRBNB_WEBHOOK_SECRET;

  // Reject if webhook secret is not configured
  if (!webhookSecret) {
    return res.status(500).json({ error: 'AIRBNB_WEBHOOK_SECRET no está configurado' });
  }

  // Always verify signature in production
  if (signature) {
    const expectedSig = crypto.createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSig) {
      return res.status(403).json({ error: 'Firma de webhook inválida' });
    }
  } else {
    return res.status(400).json({ error: 'Falta firma del webhook' });
  }

  const event = req.body;
  console.log('Airbnb webhook received:', event.event);

  try {
    if (event.event === 'reservation_created' || event.event === 'reservation_updated') {
      await airbnbService.importReservation(event.payload);
    } else if (event.event === 'reservation_cancelled') {
      const confirmationCode = event.payload?.confirmation_code;
      if (confirmationCode) {
        await prisma.reservation.updateMany({
          where: { stripePaymentId: confirmationCode },
          data: { status: 'CANCELLED' },
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Airbnb webhook processing error:', err.message);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

// GET /api/channels/airbnb/callback - OAuth callback
router.get('/airbnb/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('Airbnb OAuth error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?error=missing_code`);
  }

  // Verify CSRF state from DB (not in-memory Map)
  const oauthState = await prisma.oAuthState.findUnique({ where: { state } });
  if (!oauthState) {
    console.error('Airbnb OAuth state not found or expired');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?error=invalid_state`);
  }
  // Delete immediately to prevent replay attacks
  await prisma.oAuthState.delete({ where: { id: oauthState.id } });

  try {
    await airbnbService.exchangeCodeForTokens(code);
    await setAirbnbState({ ...await getAirbnbState(), connected: true });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?connected=true`);
  } catch (err) {
    console.error('Airbnb token exchange failed:', err.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?error=token_exchange_failed`);
  }
});

// ================== GOOGLE CALENDAR ==================

// GET /api/channels/google/status
router.get('/google/status', authenticate, authorize('ADMIN'), async (req, res) => {
  const isMock = process.env.GOOGLE_CALENDAR_MOCK === 'true';
  const channel = await prisma.channelConnection.findFirst({
    where: { channel: 'GOOGLE' }
  });
  const connected = isMock || (channel?.isActive && !!channel?.accessToken);

  res.json({
    connected,
    lastSync: channel?.lastSync || null,
    mockMode: isMock,
    credentialsConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
});

// POST /api/channels/google/connect
router.post('/google/connect', authenticate, authorize('ADMIN'), async (req, res) => {
  const isMock = process.env.GOOGLE_CALENDAR_MOCK === 'true';

  if (isMock) {
    googleCalendarService.connected = true;
    res.json({
      success: true,
      message: 'Conectado Google Calendar en modo demo',
      mockMode: true,
    });
    return;
  }

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({
      error: 'Credenciales de Google no configuradas. Configure GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el archivo .env'
    });
  }

  const authUrlData = googleCalendarService.getAuthorizationUrl();
  if (!authUrlData) {
    return res.status(500).json({ error: 'Error al generar URL de autorización' });
  }

  await prisma.oAuthState.create({
    data: {
      state: authUrlData.state,
      channel: 'GOOGLE',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  res.json({ authUrl: authUrlData.url, state: authUrlData.state });
});

// POST /api/channels/google/disconnect
router.post('/google/disconnect', authenticate, authorize('ADMIN'), async (req, res) => {
  googleCalendarService.disconnect();
  res.json({ success: true, message: 'Desconectado de Google Calendar' });
});

// POST /api/channels/google/sync
router.post('/google/sync', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const result = await googleCalendarService.syncReservations();
    res.json({
      success: true,
      eventsCreated: result.eventsCreated,
      mockMode: result.mockMode,
      lastSync: result.lastSync,
    });
  } catch (err) {
    console.error('Google Calendar sync error:', err.message);
    res.status(500).json({ error: 'Error al sincronizar con Google Calendar' });
  }
});

// GET /api/channels/google/callback
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?error=missing_code`);
  }

  const oauthState = await prisma.oAuthState.findUnique({ where: { state } });
  if (!oauthState) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?error=invalid_state`);
  }

  await prisma.oAuthState.delete({ where: { id: oauthState.id } });

  try {
    await googleCalendarService.exchangeCodeForTokens(code);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?connected=google`);
  } catch (err) {
    console.error('Google token exchange failed:', err.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?error=token_exchange_failed`);
  }
});

export default router;