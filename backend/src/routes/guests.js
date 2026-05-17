import express from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../utils/logActivity.js';

const router = express.Router();

// GET /api/guests
router.get('/', authenticate, authorize('ADMIN', 'MANAGER', 'RECEPCIONIST'), async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const take = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * take;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { documentNumber: { contains: search, mode: 'insensitive' } },
            { nationality: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [guests, total] = await Promise.all([
      prisma.guest.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { reservations: true } },
          reservations: {
            take: 1,
            orderBy: { checkIn: 'desc' },
            select: { checkIn: true, room: { select: { number: true } } },
          },
        },
      }),
      prisma.guest.count({ where }),
    ]);

    res.json({ guests, total, page: pageNum, pages: Math.ceil(total / take) });
  } catch (err) {
    next(err);
  }
});

// GET /api/guests/:id
router.get('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'RECEPCIONIST'), async (req, res, next) => {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: req.params.id },
      include: {
        reservations: {
          include: { room: { select: { number: true, name: true } } },
          orderBy: { checkIn: 'desc' },
        },
        _count: { select: { reservations: true } },
      },
    });

    if (!guest) return res.status(404).json({ error: 'Huésped no encontrado' });
    res.json({ guest });
  } catch (err) {
    next(err);
  }
});

// POST /api/guests
router.post('/', authenticate, authorize('ADMIN', 'RECEPCIONIST'), async (req, res, next) => {
  try {
    const { name, email, phone, documentType, documentNumber, nationality, birthDate, notes, vip, blacklist, language } = req.body;

    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const guest = await prisma.guest.create({
      data: { name, email, phone, documentType, documentNumber, nationality, birthDate, notes, vip, blacklist, language },
    });

    res.status(201).json({ guest });

    // Emit socket event for real-time sync
    const io = req.app.get('io');
    if (io) io.emit('guest:created', guest);

    logActivity({ userId: req.user.id, action: 'CREATED', resource: 'GUEST', resourceId: guest.id, details: { name, email }, ipAddress: req.ip });
  } catch (err) {
    next(err);
  }
});

// PUT /api/guests/:id
router.put('/:id', authenticate, authorize('ADMIN', 'RECEPCIONIST'), async (req, res, next) => {
  try {
    const { name, email, phone, documentType, documentNumber, nationality, birthDate, notes, vip, blacklist, language } = req.body;

    const guest = await prisma.guest.update({
      where: { id: req.params.id },
      data: { name, email, phone, documentType, documentNumber, nationality, birthDate, notes, vip, blacklist, language },
    });

    res.json({ guest });

    logActivity({ userId: req.user.id, action: 'UPDATED', resource: 'GUEST', resourceId: req.params.id, details: { name, email }, ipAddress: req.ip });
  } catch (err) {
    next(err);
  }
});

// GET /api/guests/:id/history
router.get('/:id/history', authenticate, authorize('ADMIN', 'MANAGER', 'RECEPCIONIST'), async (req, res, next) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { guestId: req.params.id },
      include: { room: { select: { number: true, name: true } } },
      orderBy: { checkIn: 'desc' },
    });

    res.json({ reservations });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/guests/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'RECEPCIONIST'), async (req, res, next) => {
  try {
    // Atomic transaction: check existence and delete in one operation
    const [guest] = await prisma.$transaction([
      prisma.guest.findUnique({ where: { id: req.params.id } }),
    ]);

    if (!guest) return res.status(404).json({ error: 'Huésped no encontrado' });

    // Check for active reservations before deletion
    const activeReservations = await prisma.reservation.count({
      where: { guestId: req.params.id, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
    });

    if (activeReservations > 0) {
      return res.status(409).json({ error: 'No se puede eliminar: el huésped tiene reservas activas' });
    }

    await prisma.guest.delete({ where: { id: req.params.id } });
    res.json({ message: 'Huésped eliminado correctamente' });

    logActivity({ userId: req.user.id, action: 'DELETED', resource: 'GUEST', resourceId: req.params.id, details: { name: guest.name }, ipAddress: req.ip });
  } catch (err) {
    next(err);
  }
});

export default router;