import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/notes?guestId=X -> lista notas de un huésped
// GET /api/notes?reservationId=X -> lista notas de una reserva
router.get('/', async (req, res) => {
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
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Error al obtener las notas' });
  }
});

// POST /api/notes -> crear nota { content, authorName, guestId?, reservationId? }
router.post('/', async (req, res) => {
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
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Error al crear la nota' });
  }
});

// DELETE /api/notes/:id -> eliminar nota
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.internalNote.delete({ where: { id } });
    res.json({ message: 'Nota eliminada correctamente' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Error al eliminar la nota' });
  }
});

export default router;