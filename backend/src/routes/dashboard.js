import express from 'express';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format, subMonths, eachMonthOfInterval, startOfMonth as startM, endOfMonth as endM } from 'date-fns';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { cache } from '../utils/cache.js';

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const cached = await cache.get('dashboard:stats');
    if (cached) return res.json(cached);

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const [
      totalRooms,
      occupiedToday,
      arrivalsToday,
      departuresToday,
      revenueResult,
      pendingReservations,
      upcomingArrivals,
    ] = await Promise.all([
      prisma.room.count(),
      prisma.reservation.count({ where: { status: 'CHECKED_IN' } }),
      prisma.reservation.findMany({
        where: { checkIn: { gte: todayStart, lte: todayEnd }, status: { in: ['PENDING', 'CONFIRMED'] } },
        include: { guest: { select: { name: true } }, room: { select: { number: true } } },
        orderBy: { checkIn: 'asc' },
      }),
      prisma.reservation.findMany({
        where: { checkOut: { gte: todayStart, lte: todayEnd }, status: 'CHECKED_IN' },
        include: { guest: { select: { name: true } }, room: { select: { number: true } } },
        orderBy: { checkOut: 'asc' },
      }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: startOfMonth(today), lte: endOfMonth(today) } },
        _sum: { amount: true },
      }),
      prisma.reservation.count({ where: { status: { in: ['PENDING', 'CONFIRMED'] } } }),
      prisma.reservation.findMany({
        where: { checkIn: { gt: today }, status: { in: ['PENDING', 'CONFIRMED'] } },
        take: 5, include: { guest: { select: { name: true } }, room: { select: { number: true } } },
        orderBy: { checkIn: 'asc' },
      }),
    ]);

    const result = {
      stats: {
        totalRooms,
        occupiedToday,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedToday / totalRooms) * 100) : 0,
        arrivalsToday: arrivalsToday.length,
        departuresToday: departuresToday.length,
        revenueThisMonth: revenueResult._sum.amount || 0,
        pendingReservations,
        upcomingArrivals,
        arrivals: arrivalsToday,
        departures: departuresToday,
      },
    };

    await cache.set('dashboard:stats', result, 60);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/calendar?month=2025-06&roomId=uuid&status=CHECKED_IN
router.get('/calendar', authenticate, async (req, res, next) => {
  try {
    const { month, roomId, status } = req.query;
    const date = month ? new Date(`${month}-01`) : new Date();
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const activeStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'];
    const statusFilter = status ? status.split(',') : activeStatuses;

    const cacheKey = `dashboard:calendar:${month || format(date, 'yyyy-MM')}:${roomId || 'all'}:${status || 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const whereReservation = {
      checkIn: { lte: end },
      checkOut: { gte: start },
      ...(roomId && { roomId }),
      ...(status && { status: { in: statusFilter } }),
    };

    const [reservations, blockedDates, rooms] = await Promise.all([
      prisma.reservation.findMany({
        where: whereReservation,
        include: {
          guest: { select: { id: true, name: true, vip: true, blacklist: true } },
          room: { select: { id: true, number: true, name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: [{ checkIn: 'asc' }],
      }),
      prisma.blockedDate.findMany({
        where: {
          date: { gte: start, lte: end },
          ...(roomId && { roomId }),
        },
        include: { room: { select: { id: true, number: true } } },
      }),
      prisma.room.findMany({
        select: { id: true, number: true, name: true, type: true },
        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      }),
    ]);

    const result = { reservations, blockedDates, rooms };
    await cache.set(cacheKey, result, 30);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/analytics?months=6
router.get('/analytics', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 12);
    const cacheKey = `dashboard:analytics:${months}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const today = new Date();
    const start = startOfMonth(subMonths(today, months - 1));
    const end = endOfMonth(today);

    // Monthly stats using raw aggregation for performance
    const monthlyData = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', r."checkIn") as month,
        COUNT(*)::numeric as reservation_count,
        COUNT(*) FILTER (WHERE r.status = 'CANCELLED')::numeric as cancelled_count,
        SUM(p.amount) FILTER (WHERE p.status = 'COMPLETED')::numeric as revenue,
        AVG(r.total_amount) FILTER (WHERE p.status = 'COMPLETED')::numeric as adr
      FROM reservations r
      LEFT JOIN payments p ON p.reservation_id = r.id
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
      SELECT room.id, room.number, room.name, COALESCE(SUM(p.amount)::numeric, 0) as total_revenue, COALESCE(COUNT(*), 0)::numeric as reservation_count
      FROM rooms room
      JOIN reservations r ON r.room_id = room.id
      JOIN payments p ON p.reservation_id = r.id
      WHERE p.status = 'COMPLETED' AND p.created_at >= ${start} AND p.created_at <= ${end}
      GROUP BY room.id, room.number, room.name
      ORDER BY total_revenue DESC
      LIMIT 5
    `;

    // Lead time distribution (bins)
    const leadTimeDistribution = await prisma.$queryRaw`
      SELECT
        CASE
          WHEN EXTRACT(DAY FROM r."checkIn" - r.created_at) < 7 THEN '0-6'
          WHEN EXTRACT(DAY FROM r."checkIn" - r.created_at) < 14 THEN '7-13'
          WHEN EXTRACT(DAY FROM r."checkIn" - r.created_at) < 30 THEN '14-29'
          ELSE '30+'
        END as bin,
        COUNT(*)::numeric as count
      FROM reservations r
      WHERE r."checkIn" IS NOT NULL
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

    await cache.set(cacheKey, {
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
    }, 300);
  } catch (err) {
    next(err);
  }
});

export default router;