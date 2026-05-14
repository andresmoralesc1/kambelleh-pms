import express from 'express';
import Stripe from 'stripe';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../utils/logActivity.js';

// Lazy initialization to avoid crashing when STRIPE_SECRET_KEY is not set
let stripe = null;
const getStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

const router = express.Router();

// POST /api/payments/create-intent
router.post('/create-intent', authenticate, authorize('ADMIN', 'MANAGER', 'RECEPCIONIST'), async (req, res, next) => {
  try {
    const { reservationId } = req.body;

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { guest: true },
    });

    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (reservation.stripePaymentId) {
      return res.status(409).json({ error: 'Esta reserva ya tiene un pago asociado' });
    }

    const client = getStripe();
    if (!client) return res.status(500).json({ error: 'Stripe no está configurado. Configure STRIPE_SECRET_KEY en las variables de entorno.' });

    const paymentIntent = await client.paymentIntents.create({
      amount: Math.round(Number(reservation.totalAmount) * 100), // cents
      currency: 'eur',
      metadata: {
        reservationId: reservation.id,
        guestName: reservation.guest.name,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/confirm
router.post('/confirm', authenticate, authorize('ADMIN', 'MANAGER', 'RECEPCIONIST'), async (req, res, next) => {
  try {
    const { reservationId, paymentIntentId } = req.body;

    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });

    // Idempotency: use SELECT FOR UPDATE inside transaction to prevent
    // race conditions on concurrent confirm attempts (e.g. double-click)
    const [payment] = await prisma.$transaction(async (tx) => {
      const [{ id: existingId }] = await tx.$queryRaw`
        SELECT id FROM payments WHERE stripe_charge_id = ${paymentIntentId} FOR UPDATE
      `;
      if (existingId) {
        // Already processed — return existing record
        return [await tx.payment.findUnique({ where: { id: existingId } })];
      }

      const priorPayment = await tx.payment.findFirst({
        where: { reservationId, status: 'COMPLETED' },
      });
      if (priorPayment) {
        throw Object.assign(new Error('Esta reserva ya tiene un pago completado'), { status: 409 });
      }

      const [newPayment] = await tx.$transaction([
        tx.payment.create({
          data: {
            reservationId,
            amount: reservation.totalAmount,
            currency: 'eur',
            status: 'COMPLETED',
            stripeChargeId: paymentIntentId,
            method: 'card',
          },
        }),
        tx.reservation.update({
          where: { id: reservationId },
          data: { stripePaymentId: paymentIntentId, status: 'CONFIRMED' },
        }),
      ]);
      return [newPayment];
    });

    res.json({ payment });

    logActivity({ userId: req.user.id, action: 'PAYMENT_COMPLETED', resource: 'PAYMENT', resourceId: payment.id, details: { reservationId, amount: reservation.totalAmount }, ipAddress: req.ip });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/:reservationId
router.get('/:reservationId', authenticate, authorize('ADMIN', 'MANAGER', 'RECEPCIONIST'), async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.reservationId },
    });

    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });

    const payments = await prisma.payment.findMany({
      where: { reservationId: req.params.reservationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ payments });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/refund
router.post('/refund', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { paymentId } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { reservation: true },
    });

    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
    if (payment.status !== 'COMPLETED') {
      return res.status(409).json({ error: 'El pago no está completado' });
    }

    const client = getStripe();
    if (!client) return res.status(500).json({ error: 'Stripe no está configurado. Configure STRIPE_SECRET_KEY en las variables de entorno.' });

    await client.refunds.create({ payment_intent: payment.stripeChargeId });

    // Refund processed atomically with reservation status update
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'REFUNDED' },
      });
      await tx.reservation.update({
        where: { id: payment.reservationId },
        data: { status: 'PENDING', stripePaymentId: null },
      });
    });

    res.json({ message: 'Refund processed' });
  } catch (err) {
    next(err);
  }
});

export default router;