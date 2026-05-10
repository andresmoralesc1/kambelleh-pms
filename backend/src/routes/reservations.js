import express from 'express';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendReservationConfirmation } from '../services/email.js';

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
    // IDOR fix: users can only view their own reservations unless ADMIN
    if (req.user.role !== 'ADMIN' && req.user.role !== 'RECEPTIONIST') {
      return res.status(403).json({ error: 'No tienes permisos para ver esta reserva' });
    }

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
      return res.status(400).json({ error: 'Huésped, habitación, fecha de entrada y salida son obligatorios' });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Past date validation
    if (checkInDate < today) {
      return res.status(400).json({ error: 'La fecha de entrada no puede ser en el pasado' });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ error: 'La fecha de salida debe ser posterior a la de entrada' });
    }

    // Race condition fix: use transaction for atomic availability check + booking
    const reservation = await prisma.$transaction(async (tx) => {
      // Check availability within transaction
      const overlap = await tx.reservation.findFirst({
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
        throw Object.assign(new Error('La habitación no está disponible para estas fechas'), { status: 409 });
      }

      // Calculate total
      const room = await tx.room.findUnique({ where: { id: roomId } });
      if (!room) {
        throw Object.assign(new Error('Habitación no encontrada'), { status: 404 });
      }

      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      const totalAmount = Number(room.pricePerNight) * nights;

      const created = await tx.reservation.create({
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

      return created;
    });

    res.status(201).json({ reservation });

    // Enviar email de confirmación (no-bloqueante)
    sendReservationConfirmation(reservation.guest, reservation, reservation.room);
  } catch (err) {
    next(err);
  }
});

// PUT /api/reservations/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { checkIn, checkOut, adults, children, specialRequests } = req.body;

    // Fetch reservation for authorization
    const current = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Reserva no encontrada' });

    // IDOR: only ADMIN/RECEPTIONIST or the creator can modify
    if (req.user.role !== 'ADMIN' && req.user.role !== 'RECEPTIONIST' && current.createdById !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para modificar esta reserva' });
    }

    // If changing dates, check availability atomically
    if (checkIn || checkOut) {
      const newCheckIn = checkIn ? new Date(checkIn) : current.checkIn;
      const newCheckOut = checkOut ? new Date(checkOut) : current.checkOut;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (newCheckIn < today) {
        return res.status(400).json({ error: 'La fecha de entrada no puede ser en el pasado' });
      }
      if (newCheckOut <= newCheckIn) {
        return res.status(400).json({ error: 'La fecha de salida debe ser posterior a la de entrada' });
      }

      // Atomic transaction for date change + availability check
      const reservation = await prisma.$transaction(async (tx) => {
        const overlap = await tx.reservation.findFirst({
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
          throw Object.assign(new Error('La habitación no está disponible para estas fechas'), { status: 409 });
        }

        const room = await tx.room.findUnique({ where: { id: current.roomId } });
        const nights = Math.ceil((newCheckOut - newCheckIn) / (1000 * 60 * 60 * 24));
        const totalAmount = Number(room.pricePerNight) * nights;

        return tx.reservation.update({
          where: { id: req.params.id },
          data: { checkIn: newCheckIn, checkOut: newCheckOut, adults, children, specialRequests, totalAmount },
          include: { guest: true, room: true },
        });
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
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });

    // IDOR: only ADMIN/RECEPTIONIST or the creator can change status
    if (req.user.role !== 'ADMIN' && req.user.role !== 'RECEPTIONIST' && reservation.createdById !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para cambiar el estado de esta reserva' });
    }

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
      return res.status(409).json({ error: 'No se puede eliminar una reserva con estado check-in o check-out' });
    }

    await prisma.reservation.delete({ where: { id: req.params.id } });
    res.json({ message: 'Reservation deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;