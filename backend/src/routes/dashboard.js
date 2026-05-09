import express from 'express';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Total rooms
    const totalRooms = await prisma.room.count();

    // Occupied today (checked in)
    const occupiedToday = await prisma.reservation.count({
      where: { status: 'CHECKED_IN' },
    });

    // Arrivals today
    const arrivalsToday = await prisma.reservation.findMany({
      where: {
        checkIn: { gte: todayStart, lte: todayEnd },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { guest: { select: { name: true, phone: true } }, room: { select: { number: true } } },
      orderBy: { checkIn: 'asc' },
    });

    // Departures today
    const departuresToday = await prisma.reservation.findMany({
      where: {
        checkOut: { gte: todayStart, lte: todayEnd },
        status: 'CHECKED_IN',
      },
      include: { guest: { select: { name: true } }, room: { select: { number: true } } },
      orderBy: { checkOut: 'asc' },
    });

    // Revenue this month
    const revenueResult = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    // Pending reservations count
    const pendingReservations = await prisma.reservation.count({
      where: { status: { in: ['PENDING', 'CONFIRMED'] } },
    });

    // Next 5 upcoming arrivals
    const upcomingArrivals = await prisma.reservation.findMany({
      where: {
        checkIn: { gt: today },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      take: 5,
      include: { guest: { select: { name: true } }, room: { select: { number: true } } },
      orderBy: { checkIn: 'asc' },
    });

    res.json({
      stats: {
        totalRooms,
        occupiedToday,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedToday / totalRooms) * 100) : 0,
        arrivalsToday: arrivalsToday.length,
        departuresToday: departuresToday.length,
        revenueThisMonth: revenueResult._sum.amount || 0,
        pendingReservations,
        upcomingArrivals,
        arrivalsToday,
        departuresToday,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/calendar?month=2025-06
router.get('/calendar', authenticate, async (req, res, next) => {
  try {
    const { month } = req.query;
    const date = month ? new Date(`${month}-01`) : new Date();
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const reservations = await prisma.reservation.findMany({
      where: {
        checkIn: { lte: end },
        checkOut: { gte: start },
      },
      include: {
        guest: { select: { name: true } },
        room: { select: { id: true, number: true, name: true } },
      },
      orderBy: { checkIn: 'asc' },
    });

    const blockedDates = await prisma.blockedDate.findMany({
      where: { date: { gte: start, lte: end } },
      include: { room: { select: { number: true } } },
    });

    res.json({ reservations, blockedDates });
  } catch (err) {
    next(err);
  }
});

export default router;