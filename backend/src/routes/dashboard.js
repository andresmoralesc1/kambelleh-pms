import express from 'express';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format, subMonths, eachMonthOfInterval, startOfMonth as startM, endOfMonth as endM } from 'date-fns';
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

    // Revenue this month - use indexed query
    const revenueResult = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    // Pending reservations count - use indexed query
    const pendingReservations = await prisma.reservation.count({
      where: { status: { in: ['PENDING', 'CONFIRMED'] } },
    });

    // Next 5 upcoming arrivals - use indexed query
    const upcomingArrivals = await prisma.reservation.findMany({
      where: {
        checkIn: { gt: today },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      take: 5,
      include: { guest: { select: { name: true } }, room: { select: { number: true } } },
      orderBy: { checkIn: 'asc' },
    });

    // Total rooms - already uses count with no filter (efficient)

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

// GET /api/dashboard/analytics?months=6
router.get('/analytics', authenticate, async (req, res, next) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 12);
    const today = new Date();
    const start = startOfMonth(subMonths(today, months - 1));
    const end = endOfMonth(today);

    // Monthly stats using raw aggregation for performance
    const monthlyData = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', r."checkIn") as month,
        COUNT(*) as reservation_count,
        COUNT(*) FILTER (WHERE r.status = 'CANCELLED') as cancelled_count,
        SUM(r."totalAmount") FILTER (WHERE p.status = 'COMPLETED') as revenue,
        AVG(r."totalAmount") FILTER (WHERE p.status = 'COMPLETED') as adr,
        EXTRACT(DAY FROM r."checkIn" - r."createdAt") as lead_time
      FROM reservations r
      LEFT JOIN payments p ON p."reservationId" = r.id
      WHERE r."checkIn" >= ${start} AND r."checkIn" <= ${end}
      GROUP BY DATE_TRUNC('month', r."checkIn")
      ORDER BY month ASC
    `;

    // Status breakdown for current month
    const statusBreakdown = await prisma.reservation.groupBy({
      by: ['status'],
      _count: { status: true },
      where: { checkIn: { gte: startOfMonth(today), lte: endOfMonth(today) } },
    });

    // Top rooms by revenue
    const topRooms = await prisma.$queryRaw`
      SELECT r."id", r.number, r.name, SUM(p.amount) as total_revenue, COUNT(*) as reservation_count
      FROM reservations r
      JOIN payments p ON p."reservationId" = r.id
      WHERE p.status = 'COMPLETED' AND p."createdAt" >= ${start} AND p."createdAt" <= ${end}
      GROUP BY r."id", r.number, r.name
      ORDER BY total_revenue DESC
      LIMIT 5
    `;

    // Lead time distribution (bins)
    const leadTimeDistribution = await prisma.$queryRaw`
      SELECT
        CASE
          WHEN EXTRACT(DAY FROM r."checkIn" - r."createdAt") < 7 THEN '0-6'
          WHEN EXTRACT(DAY FROM r."checkIn" - r."createdAt") < 14 THEN '7-13'
          WHEN EXTRACT(DAY FROM r."checkIn" - r."createdAt") < 30 THEN '14-29'
          ELSE '30+'
        END as bin,
        COUNT(*) as count
      FROM reservations r
      WHERE r."createdAt" IS NOT NULL AND r."checkIn" >= ${start}
      GROUP BY bin
      ORDER BY bin ASC
    `;

    // This month vs last month comparison
    const thisMonthStart = startOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));

    const [thisMonthRevenue, lastMonthRevenue, thisMonthReservations, lastMonthReservations] = await Promise.all([
      prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: thisMonthStart } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { amount: true } }),
      prisma.reservation.count({ where: { checkIn: { gte: thisMonthStart } } }),
      prisma.reservation.count({ where: { checkIn: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    ]);

    const revenueChange = lastMonthRevenue._sum.amount > 0
      ? ((Number(thisMonthRevenue._sum.amount || 0) - Number(lastMonthRevenue._sum.amount)) / Number(lastMonthRevenue._sum.amount) * 100)
      : 0;

    const reservationChange = lastMonthReservations > 0
      ? ((thisMonthReservations - lastMonthReservations) / lastMonthReservations * 100)
      : 0;

    res.json({
      monthlyData,
      statusBreakdown,
      topRooms,
      leadTimeDistribution,
      comparison: {
        revenueThisMonth: Number(thisMonthRevenue._sum.amount || 0),
        revenueLastMonth: Number(lastMonthRevenue._sum.amount || 0),
        revenueChange: Math.round(revenueChange * 10) / 10,
        reservationsThisMonth: thisMonthReservations,
        reservationsLastMonth: lastMonthReservations,
        reservationChange: Math.round(reservationChange * 10) / 10,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;