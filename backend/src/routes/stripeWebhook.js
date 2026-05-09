import express from 'express';
import Stripe from 'stripe';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// POST /api/payments/webhook
// Stripe calls this with raw body - route already configured in index.js
async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
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
        await prisma.payment.create({
          data: {
            reservationId,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            status: 'COMPLETED',
            stripeChargeId: paymentIntent.id,
            method: 'card',
          },
        });

        await prisma.reservation.update({
          where: { id: reservationId },
          data: { status: 'CONFIRMED', stripePaymentId: paymentIntent.id },
        });
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.log('Payment failed:', paymentIntent.id);
      break;
    }
  }

  res.json({ received: true });
}

export default router;