import express from 'express';
import Stripe from 'stripe';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// POST /api/payments/create-intent
router.post('/create-intent', authenticate, async (req, res, next) => {
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

    const paymentIntent = await stripe.paymentIntents.create({
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
router.post('/confirm', authenticate, async (req, res, next) => {
  try {
    const { reservationId, paymentIntentId } = req.body;

    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });

    // Idempotency: ya existe pago para esta reserva
    const existingPayment = await prisma.payment.findFirst({
      where: { reservationId, stripeChargeId: paymentIntentId },
    });
    if (existingPayment) {
      return res.json({ payment: existingPayment });
    }

    // Verificar que no haya otro pago completado para esta reserva
    const priorPayment = await prisma.payment.findFirst({
      where: { reservationId, status: 'COMPLETED' },
    });
    if (priorPayment) {
      return res.status(409).json({ error: 'Esta reserva ya tiene un pago completado' });
    }

    // Create payment record + update reservation atomically
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          reservationId,
          amount: reservation.totalAmount,
          currency: 'eur',
          status: 'COMPLETED',
          stripeChargeId: paymentIntentId,
          method: 'card',
        },
      }),
      prisma.reservation.update({
        where: { id: reservationId },
        data: { stripePaymentId: paymentIntentId, status: 'CONFIRMED' },
      }),
    ]);

    res.json({ payment });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/:reservationId
router.get('/:reservationId', authenticate, async (req, res, next) => {
  try {
    // Verify the user has access to this reservation (owns the guest or is staff)
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.reservationId },
      include: { guest: { select: { id: true } } },
    });

    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });

    // Staff can view any payment; non-staff can only view their own reservation's payments
    if (req.user.role !== 'ADMIN' && req.user.role !== 'RECEPTIONIST') {
      if (reservation.guestId !== req.user.id) {
        return res.status(403).json({ error: 'No tienes permisos para ver estos pagos' });
      }
    }

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

    await stripe.refunds.create({ payment_intent: payment.stripeChargeId });

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED' },
    });

    res.json({ message: 'Refund processed' });
  } catch (err) {
    next(err);
  }
});

export default router;