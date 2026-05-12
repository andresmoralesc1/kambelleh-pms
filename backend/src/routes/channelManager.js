import express from 'express';
import crypto from 'crypto';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import airbnbService from '../services/airbnbService.js';

const router = express.Router();

// Estado en memoria (en producción usar Redis o BD)
let airbnbState = {
  connected: false,
  lastSync: null,
  mockMode: process.env.AIRBNB_MOCK === 'true',
};

// In-memory CSRF state store (single-process; use Redis in multi-instance prod)
const airbnbOAuthStates = new Map();

// GET /api/channels/airbnb/status
router.get('/airbnb/status', authenticate, authorize('ADMIN'), async (req, res) => {
  const isMock = process.env.AIRBNB_MOCK === 'true';
  const connected = isMock || airbnbService.isConnected();

  res.json({
    connected,
    lastSync: airbnbState.lastSync,
    mockMode: isMock,
    credentialsConfigured: !!(process.env.AIRBNB_CLIENT_ID && process.env.AIRBNB_CLIENT_SECRET),
  });
});

// POST /api/channels/airbnb/connect
router.post('/airbnb/connect', authenticate, authorize('ADMIN'), async (req, res) => {
  const isMock = process.env.AIRBNB_MOCK === 'true';

  if (isMock) {
    airbnbState.connected = true;
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

  // Guardar state en memoria para verificación CSRF
  airbnbOAuthStates.set(authUrlData.state, true);

  res.json({ authUrl: authUrlData.url, state: authUrlData.state });
});

// POST /api/channels/airbnb/disconnect
router.post('/airbnb/disconnect', authenticate, authorize('ADMIN'), async (req, res) => {
  const isMock = process.env.AIRBNB_MOCK === 'true';

  airbnbService.disconnect();
  airbnbState.connected = false;
  airbnbState.lastSync = null;

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

      airbnbState.lastSync = new Date().toISOString();

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
    airbnbState.lastSync = new Date().toISOString();

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

  // Verificar state CSRF (in-memory store)
  if (!airbnbOAuthStates.has(state)) {
    console.error('Airbnb OAuth state mismatch');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?error=invalid_state`);
  }
  airbnbOAuthStates.delete(state);

  try {
    await airbnbService.exchangeCodeForTokens(code);
    airbnbState.connected = true;

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?connected=true`);
  } catch (err) {
    console.error('Airbnb token exchange failed:', err.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/channels?error=token_exchange_failed`);
  }
});

export default router;