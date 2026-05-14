import express from 'express';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import prisma from '../config/database.js';
import { sendCheckinReminder, sendCheckoutReminder } from '../services/email.js';

const router = express.Router();

// Cleanup expired OAuthState entries to prevent table bloat
async function cleanupExpiredOAuthStates() {
  try {
    const result = await prisma.oAuthState.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} expired OAuthState entries`);
    }
    return result.count;
  } catch (err) {
    console.error('OAuthState cleanup error:', err.message);
    return 0;
  }
}

// GET /api/cron/reservation-reminders
// Protected by X_CRON_SECRET header — meant to be called by an external cron job every hour
router.get('/reservation-reminders', async (req, res, next) => {
  try {
    // Auth: check secret token
    const secret = req.headers['x_cron_secret'];
    if (!secret || secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Token de verificación faltante o inválido' });
    }

    const now = new Date();
    const tomorrow = addDays(startOfDay(now), 1);
    const tomorrowEnd = endOfDay(tomorrow);
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Reservations with checkIn tomorrow and no check-in reminder sent
    const checkinDue = await prisma.reservation.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        checkIn: { gte: tomorrowStart, lte: tomorrowEnd },
        reminderCheckedInSentAt: null,
      },
      include: { guest: true, room: true },
    });

    // Reservations with checkOut today and no check-out reminder sent
    const checkoutDue = await prisma.reservation.findMany({
      where: {
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        checkOut: { gte: todayStart, lte: todayEnd },
        reminderCheckedOutSentAt: null,
      },
      include: { guest: true, room: true },
    });

    const sent = { checkin: [], checkout: [] };
    const alreadySent = { checkin: [], checkout: [] };

    // Fire check-in reminders (fire-and-forget)
    await Promise.allSettled(
      checkinDue.map(async (reservation) => {
        sendCheckinReminder(reservation.guest, reservation, reservation.room);
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { reminderCheckedInSentAt: now },
        });
        return reservation.id;
      })
    );

    // Fire check-out reminders (fire-and-forget)
    await Promise.allSettled(
      checkoutDue.map(async (reservation) => {
        sendCheckoutReminder(reservation.guest, reservation, reservation.room);
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { reminderCheckedOutSentAt: now },
        });
        return reservation.id;
      })
    );

    // Re-query to get updated timestamps
    const updatedCheckin = await prisma.reservation.findMany({
      where: { id: { in: checkinDue.map((r) => r.id) } },
      select: { id: true },
    });

    const updatedCheckout = await prisma.reservation.findMany({
      where: { id: { in: checkoutDue.map((r) => r.id) } },
      select: { id: true },
    });

    sent.checkin = updatedCheckin.map((r) => r.id);
    sent.checkout = updatedCheckout.map((r) => r.id);

    // Run OAuthState cleanup and reservation reminders together
    const cleaned = await cleanupExpiredOAuthStates();

    res.json({
      cleanupOAuthStates: cleaned,
      sent,
      alreadySent,
      summary: {
        checkinRemindersSent: sent.checkin.length,
        checkoutRemindersSent: sent.checkout.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cron/cleanup-oauth - Manual cleanup trigger (also called by reservation-reminders)
router.get('/cleanup-oauth', async (req, res, next) => {
  try {
    const secret = req.headers['x_cron_secret'];
    if (!secret || secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Token de verificación faltante o inválido' });
    }
    const cleaned = await cleanupExpiredOAuthStates();
    res.json({ message: `Limpieza completada. ${cleaned} registros eliminados.` });
  } catch (err) {
    next(err);
  }
});

export default router;
