import express from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { sendReservationConfirmation } from '../services/email.js';

const router = express.Router();

// Validation schemas
const availabilitySchema = z.object({
  checkIn: z.string().refine((d) => !isNaN(Date.parse(d)), {
    message: 'Fecha de entrada inválida',
  }),
  checkOut: z.string().refine((d) => !isNaN(Date.parse(d)), {
    message: 'Fecha de salida inválida',
  }),
  guests: z.coerce.number().int().min(1, 'Al menos 1 huésped').max(20, 'Máximo 20 huéspedes'),
});

const reservationSchema = z.object({
  checkIn: z.string().refine((d) => !isNaN(Date.parse(d)), {
    message: 'Fecha de entrada inválida',
  }),
  checkOut: z.string().refine((d) => !isNaN(Date.parse(d)), {
    message: 'Fecha de salida inválida',
  }),
  adults: z.coerce.number().int().min(1, 'Al menos 1 adulto').max(20).default(1),
  children: z.coerce.number().int().min(0).max(10).default(0),
  roomId: z.string().uuid('ID de habitación inválido'),
  guest: z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
    email: z.string().email('Email inválido').max(100),
    phone: z.string().min(6, 'Teléfono inválido').max(30).optional().or(z.literal('')),
  }),
  specialRequests: z.string().max(500).optional(),
});

// GET /api/public/rooms/availability
router.get('/rooms/availability', async (req, res, next) => {
  try {
    const parsed = availabilitySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { checkIn, checkOut, guests } = parsed.data;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      return res.status(400).json({ error: 'La fecha de entrada no puede ser en el pasado' });
    }
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ error: 'La fecha de salida debe ser posterior a la de entrada' });
    }

    // Find all rooms that are not available for the given period
    // (have overlapping PENDING/CONFIRMED/CHECKED_IN reservations OR blocked dates)
    const unavailableRoomIds = await prisma.$transaction(async (tx) => {
      const conflictingReservations = await tx.reservation.findMany({
        where: {
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          AND: [
            { checkIn: { lt: checkOutDate } },
            { checkOut: { gt: checkInDate } },
          ],
        },
        select: { roomId: true },
      });

      const conflictingBlocked = await tx.blockedDate.findMany({
        where: {
          date: { gte: checkInDate, lt: checkOutDate },
        },
        select: { roomId: true },
      });

      const reservedIds = new Set(conflictingReservations.map((r) => r.roomId));
      conflictingBlocked.forEach((b) => reservedIds.add(b.roomId));
      return [...reservedIds];
    });

    const rooms = await prisma.room.findMany({
      where: {
        status: 'AVAILABLE',
        capacity: { gte: guests },
        id: { notIn: unavailableRoomIds },
      },
      select: {
        id: true,
        number: true,
        name: true,
        type: true,
        capacity: true,
        pricePerNight: true,
        amenities: true,
        floor: true,
      },
      orderBy: [{ type: 'asc' }, { pricePerNight: 'asc' }],
    });

    res.json({ rooms });
  } catch (err) {
    next(err);
  }
});

// POST /api/public/reservations
router.post('/reservations', async (req, res, next) => {
  try {
    const parsed = reservationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { checkIn, checkOut, adults, children, roomId, guest, specialRequests } = parsed.data;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      return res.status(400).json({ error: 'La fecha de entrada no puede ser en el pasado' });
    }
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ error: 'La fecha de salida debe ser posterior a la de entrada' });
    }

    const reservation = await prisma.$transaction(async (tx) => {
      // Check overlap within transaction
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

      const blockedOverlap = await tx.blockedDate.findFirst({
        where: {
          roomId,
          date: { gte: checkInDate, lt: checkOutDate },
        },
      });

      if (blockedOverlap) {
        throw Object.assign(new Error('La habitación está bloqueada para estas fechas'), { status: 409 });
      }

      // Find or create guest by email
      let guestRecord = await tx.guest.findFirst({
        where: { email: guest.email.toLowerCase() },
      });

      if (!guestRecord) {
        guestRecord = await tx.guest.create({
          data: {
            name: guest.name,
            email: guest.email.toLowerCase(),
            phone: guest.phone || null,
          },
        });
      }

      const room = await tx.room.findUnique({ where: { id: roomId } });
      if (!room) {
        throw Object.assign(new Error('Habitación no encontrada'), { status: 404 });
      }

      if (room.status !== 'AVAILABLE') {
        throw Object.assign(new Error('La habitación no está disponible'), { status: 409 });
      }

      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      const totalAmount = Number(room.pricePerNight) * nights;

      const created = await tx.reservation.create({
        data: {
          guestId: guestRecord.id,
          roomId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          totalAmount,
          adults,
          children,
          specialRequests: specialRequests || null,
          source: 'PUBLIC_WIDGET',
          status: 'PENDING',
          createdById: null,
        },
        include: { guest: true, room: true },
      });

      return created;
    });

    res.status(201).json({ reservation });

    // Send confirmation email (fire-and-forget, non-blocking)
    sendReservationConfirmation(reservation.guest, reservation, reservation.room);
  } catch (err) {
    next(err);
  }
});

export default router;
