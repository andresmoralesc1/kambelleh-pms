import express from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../utils/logActivity.js';

const router = express.Router();

// GET /api/rooms
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, type } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const rooms = await prisma.room.findMany({
      where,
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      include: { _count: { select: { reservations: true } } },
    });

    res.json({ rooms });
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: {
        reservations: {
          where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
          select: { id: true, checkIn: true, checkOut: true, status: true, guest: { select: { name: true } } },
        },
        blockedDates: { where: { date: { gte: new Date() } } },
      },
    });

    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room });
  } catch (err) {
    next(err);
  }
});

// POST /api/rooms
router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { number, name, type, capacity, pricePerNight, amenities, floor } = req.body;

    if (!number || !name || !capacity || !pricePerNight) {
      return res.status(400).json({ error: 'Número, nombre, capacidad y precio por noche son obligatorios' });
    }

    const room = await prisma.room.create({
      data: { number, name, type, capacity, pricePerNight, amenities, floor },
    });

    res.status(201).json({ room });

    logActivity({ userId: req.user.id, action: 'CREATED', resource: 'ROOM', resourceId: room.id, details: { number, name, type }, ipAddress: req.ip });
  } catch (err) {
    next(err);
  }
});

// PUT /api/rooms/:id
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { number, name, type, capacity, pricePerNight, status, amenities, floor } = req.body;

    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: { number, name, type, capacity, pricePerNight, status, amenities, floor },
    });

    res.json({ room });

    logActivity({ userId: req.user.id, action: 'UPDATED', resource: 'ROOM', resourceId: req.params.id, details: { number, name, status }, ipAddress: req.ip });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    // Check for active reservations
    const active = await prisma.reservation.findFirst({
      where: { roomId: req.params.id, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
    });

    if (active) {
      return res.status(409).json({ error: 'No se puede eliminar: tiene reservas activas' });
    }

    await prisma.room.delete({ where: { id: req.params.id } });
    res.json({ message: 'Room deleted' });

    logActivity({ userId: req.user.id, action: 'DELETED', resource: 'ROOM', resourceId: req.params.id, details: null, ipAddress: req.ip });
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:id/availability
router.get('/:id/availability', authenticate, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Las fechas from y to son obligatorias' });

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const reservations = await prisma.reservation.findMany({
      where: {
        roomId: req.params.id,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        OR: [
          { checkIn: { lte: toDate }, checkOut: { gte: fromDate } },
        ],
      },
      select: { id: true, checkIn: true, checkOut: true, status: true },
    });

    const blocked = await prisma.blockedDate.findMany({
      where: { roomId: req.params.id, date: { gte: fromDate, lte: toDate } },
      select: { date: true, reason: true },
    });

    res.json({ reservations, blockedDates: blocked });
  } catch (err) {
    next(err);
  }
});

export default router;