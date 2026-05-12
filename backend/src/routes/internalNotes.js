import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// GET /api/notes?guestId=X -> lista notas de un huésped
// GET /api/notes?reservationId=X -> lista notas de una reserva
router.get('/', authenticate, authorize('ADMIN', 'MANAGER', 'RECEPTIONIST'), async (req, res, next) => {
  const { guestId, reservationId } = req.query;
  try {
    const where = {};
    if (guestId) where.guestId = guestId;
    if (reservationId) where.reservationId = reservationId;
    const notes = await prisma.internalNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ notes });
  } catch (error) {
    next(error);
  }
});

// POST /api/notes -> crear nota { content, authorName, guestId?, reservationId? }
router.post('/', authenticate, authorize('ADMIN', 'MANAGER', 'RECEPTIONIST'), async (req, res, next) => {
  const { content, authorName, guestId, reservationId } = req.body;
  if (!content || !authorName) {
    return res.status(400).json({ error: 'Contenido y nombre del autor son requeridos' });
  }
  try {
    const note = await prisma.internalNote.create({
      data: {
        content,
        authorName,
        guestId: guestId || null,
        reservationId: reservationId || null,
      },
    });
    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notes/:id -> eliminar nota
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'RECEPTIONIST'), async (req, res, next) => {
  const { id } = req.params;
  try {
    await prisma.internalNote.delete({ where: { id } });
    res.json({ message: 'Nota eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

export default router;
