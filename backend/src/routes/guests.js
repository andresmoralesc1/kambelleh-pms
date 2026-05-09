import express from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/guests
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, limit = 50 } = req.query;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const guests = await prisma.guest.findMany({
      where,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { reservations: true } },
        reservations: {
          take: 1,
          orderBy: { checkIn: 'desc' },
          select: { checkIn: true, room: { select: { number: true } } },
        },
      },
    });

    res.json({ guests });
  } catch (err) {
    next(err);
  }
});

// GET /api/guests/:id
router.get('/:id', authenticate, async (req, res, next) => {
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

    if (!guest) return res.status(404).json({ error: 'Guest not found' });
    res.json({ guest });
  } catch (err) {
    next(err);
  }
});

// POST /api/guests
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, email, phone, documentType, documentNumber, nationality, birthDate, notes } = req.body;

    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const guest = await prisma.guest.create({
      data: { name, email, phone, documentType, documentNumber, nationality, birthDate, notes },
    });

    res.status(201).json({ guest });
  } catch (err) {
    next(err);
  }
});

// PUT /api/guests/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { name, email, phone, documentType, documentNumber, nationality, birthDate, notes } = req.body;

    const guest = await prisma.guest.update({
      where: { id: req.params.id },
      data: { name, email, phone, documentType, documentNumber, nationality, birthDate, notes },
    });

    res.json({ guest });
  } catch (err) {
    next(err);
  }
});

// GET /api/guests/:id/history
router.get('/:id/history', authenticate, async (req, res, next) => {
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

export default router;