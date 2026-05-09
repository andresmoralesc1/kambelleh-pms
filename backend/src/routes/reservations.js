import express from 'express';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reservations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, roomId, from, to, guestId } = req.query;
    const where = {};

    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (guestId) where.guestId = guestId;

    if (from || to) {
      where.checkIn = {};
      if (from) where.checkIn.gte = new Date(from);
      if (to) where.checkIn.lte = new Date(to);
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        guest: { select: { id: true, name: true, email: true, phone: true } },
        room: { select: { id: true, number: true, name: true } },
      },
      orderBy: { checkIn: 'desc' },
    });

    res.json({ reservations });
  } catch (err) {
    next(err);
  }
});

// GET /api/reservations/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: {
        guest: true,
        room: true,
        payments: true,
        createdBy: { select: { name: true } },
      },
    });

    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json({ reservation });
  } catch (err) {
    next(err);
  }
});

// POST /api/reservations
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { guestId, roomId, checkIn, checkOut, adults = 1, children = 0, specialRequests } = req.body;

    if (!guestId || !roomId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'guestId, roomId, checkIn and checkOut are required' });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ error: 'checkOut must be after checkIn' });
    }

    // Check availability
    const overlap = await prisma.reservation.findFirst({
      where: {
        roomId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } },
        ],
      },
    });

    if (overlap) {
      return res.status(409).json({ error: 'Room is not available for these dates' });
    }

    // Calculate total
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalAmount = Number(room.pricePerNight) * nights;

    const reservation = await prisma.reservation.create({
      data: {
        guestId,
        roomId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        totalAmount,
        adults,
        children,
        specialRequests,
        createdById: req.user.id,
        status: 'PENDING',
      },
      include: { guest: true, room: true },
    });

    res.status(201).json({ reservation });
  } catch (err) {
    next(err);
  }
});

// PUT /api/reservations/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { checkIn, checkOut, adults, children, specialRequests } = req.body;

    // If changing dates, check availability
    if (checkIn || checkOut) {
      const current = await prisma.reservation.findUnique({ where: { id: req.params.id } });
      const newCheckIn = checkIn ? new Date(checkIn) : current.checkIn;
      const newCheckOut = checkOut ? new Date(checkOut) : current.checkOut;

      const overlap = await prisma.reservation.findFirst({
        where: {
          roomId: current.roomId,
          id: { not: req.params.id },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          AND: [
            { checkIn: { lt: newCheckOut } },
            { checkOut: { gt: newCheckIn } },
          ],
        },
      });

      if (overlap) {
        return res.status(409).json({ error: 'Room is not available for these dates' });
      }

      // Recalculate total
      const room = await prisma.room.findUnique({ where: { id: current.roomId } });
      const nights = Math.ceil((newCheckOut - newCheckIn) / (1000 * 60 * 60 * 24));
      const totalAmount = Number(room.pricePerNight) * nights;

      const reservation = await prisma.reservation.update({
        where: { id: req.params.id },
        data: { checkIn: newCheckIn, checkOut: newCheckOut, adults, children, specialRequests, totalAmount },
        include: { guest: true, room: true },
      });

      return res.json({ reservation });
    }

    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { adults, children, specialRequests },
      include: { guest: true, room: true },
    });

    res.json({ reservation });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/reservations/:id/status
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

    // Update room status based on reservation status
    if (status === 'CHECKED_IN') {
      await prisma.room.update({ where: { id: reservation.roomId }, data: { status: 'OCCUPIED' } });
    } else if (status === 'CHECKED_OUT' || status === 'CANCELLED') {
      await prisma.room.update({ where: { id: reservation.roomId }, data: { status: 'AVAILABLE' } });
    }

    const updated = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status },
      include: { guest: true, room: true },
    });

    res.json({ reservation: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/reservations/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

    if (['CHECKED_IN', 'CHECKED_OUT'].includes(reservation.status)) {
      return res.status(409).json({ error: 'Cannot delete checked-in or checked-out reservations' });
    }

    await prisma.reservation.delete({ where: { id: req.params.id } });
    res.json({ message: 'Reservation deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;