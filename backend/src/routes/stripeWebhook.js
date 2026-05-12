import express from 'express';
import Stripe from 'stripe';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

// Lazy initialization to avoid crashing when STRIPE_SECRET_KEY is not set
let stripe = null;
const getStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

const router = express.Router();

// POST /api/payments/webhook
// Stripe calls this with raw body - route already configured in index.js
async function stripeWebhook(req, res) {
  const client = getStripe();
  if (!client) {
    console.error('Stripe not configured - webhook skipped');
    return res.status(500).send('Stripe not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = client.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const { reservationId } = paymentIntent.metadata;

      if (reservationId) {
        // Idempotency: use SELECT FOR UPDATE inside transaction to prevent
        // race conditions when duplicate webhook events arrive simultaneously
        await prisma.$transaction(async (tx) => {
          const [{ id: existingId }] = await tx.$queryRaw`
            SELECT id FROM payments WHERE stripe_charge_id = ${paymentIntent.id} FOR UPDATE
          `;
          if (existingId) {
            // Already processed — exit transaction early
            return;
          }

          await tx.payment.create({
            data: {
              reservationId,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              status: 'COMPLETED',
              stripeChargeId: paymentIntent.id,
              method: 'card',
            },
          });
          await tx.reservation.update({
            where: { id: reservationId },
            data: { status: 'CONFIRMED', stripePaymentId: paymentIntent.id },
          });
        });
      } else {
        console.warn('Webhook: payment_intent.succeeded sin reservationId:', paymentIntent.id);
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      const { reservationId } = paymentIntent.metadata;
      console.log('Payment failed:', paymentIntent.id);
      if (reservationId) {
        await prisma.reservation.update({
          where: { id: reservationId },
          data: { status: 'CANCELLED' },
        }).catch(() => {
          // Reservation might not exist or already be in a final state
        });
      }
      break;
    }
  }

  res.json({ received: true });
}

export default router;