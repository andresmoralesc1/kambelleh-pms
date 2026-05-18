import express from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/cleaning/rooms - todas las habitaciones con su cleaningStatus (para el grid)
router.get('/rooms', authenticate, async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      select: {
        id: true,
        number: true,
        name: true,
        floor: true,
        cleaningStatus: true,
        type: true,
      },
    });

    res.json({ rooms });
  } catch (err) {
    next(err);
  }
});

// GET /api/cleaning/rooms/:id/cleaning-logs
router.get('/rooms/:id/cleaning-logs', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ error: 'Habitación no encontrada' });

    const logs = await prisma.cleaningLog.findMany({
      where: { roomId: id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      include: { staff: { select: { id: true, name: true, email: true } } },
    });

    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/cleaning/rooms/:id/cleaning-status
router.patch('/rooms/:id/cleaning-status', authenticate, authorize('ADMIN', 'MANAGER', 'RECEPCIONIST'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['CLEANED', 'NEEDS_CLEANING', 'IN_CLEANING', 'MAINTENANCE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado de limpieza inválido' });
    }

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ error: 'Habitación no encontrada' });

    const updated = await prisma.room.update({
      where: { id },
      data: { cleaningStatus: status },
    });

    res.json({ room: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/cleaning/rooms/:id/cleaning-logs
router.post('/rooms/:id/cleaning-logs', authenticate, authorize('ADMIN', 'MANAGER', 'RECEPCIONIST'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { performedBy, status, notes, staffId } = req.body;

    if (!performedBy || !status) {
      return res.status(400).json({ error: 'El personal de limpieza y el estado son obligatorios' });
    }

    const validStatuses = ['CLEANED', 'NEEDS_CLEANING', 'IN_CLEANING', 'MAINTENANCE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado de limpieza inválido' });
    }

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ error: 'Habitación no encontrada' });

    // Validate staffId if provided
    if (staffId) {
      const staff = await prisma.user.findUnique({ where: { id: staffId } });
      if (!staff) return res.status(400).json({ error: 'Usuario de limpieza no encontrado' });
    }

    const log = await prisma.cleaningLog.create({
      data: {
        roomId: id,
        staffId: staffId || null,
        performedBy,
        status,
        notes,
        completedAt: status === 'CLEANED' ? new Date() : null,
      },
    });

    // Also update room status if needed
    if (status === 'CLEANED' || status === 'NEEDS_CLEANING' || status === 'MAINTENANCE') {
      await prisma.room.update({
        where: { id },
        data: { cleaningStatus: status },
      });
    }

    // Return log with staff relation
    const logWithStaff = await prisma.cleaningLog.findUnique({
      where: { id: log.id },
      include: { staff: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ log: logWithStaff });
  } catch (err) {
    next(err);
  }
});

export default router;