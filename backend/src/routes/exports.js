import express from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Formatear fecha como YYYY-MM-DD
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Convertir a CSV
const toCSV = (rows, headers) => {
  const headerLine = headers.join(',');
  const dataLines = rows.map(row =>
    headers.map(h => {
      const val = row[h] ?? '';
      // Escapar comillas y envolver si contiene coma/comilla/salto
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
};

// GET /api/exports/reservations
router.get('/reservations', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        guest: { select: { id: true, name: true, email: true } },
        room: { select: { id: true, number: true } },
        payments: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['id', 'guestName', 'guestEmail', 'roomNumber', 'checkIn', 'checkOut', 'status', 'totalAmount', 'paymentStatus', 'createdAt'];

    const rows = reservations.map(r => ({
      id: r.id,
      guestName: r.guest?.name || '',
      guestEmail: r.guest?.email || '',
      roomNumber: r.room?.number || '',
      checkIn: formatDate(r.checkIn),
      checkOut: formatDate(r.checkOut),
      status: r.status,
      totalAmount: r.totalAmount ? Number(r.totalAmount).toFixed(2) : '0.00',
      paymentStatus: r.payments?.[0]?.status || 'PENDING',
      createdAt: formatDate(r.createdAt),
    }));

    const csv = toCSV(rows, headers);
    const date = formatDate(new Date());

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kambelleh_reservas_${date}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// GET /api/exports/guests
router.get('/guests', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const guests = await prisma.guest.findMany({
      include: {
        _count: { select: { reservations: true } },
        reservations: {
          take: 1,
          orderBy: { checkIn: 'desc' },
          select: { checkIn: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['id', 'name', 'email', 'phone', 'nationality', 'documentType', 'documentNumber', 'totalReservations', 'lastStay'];

    const rows = guests.map(g => ({
      id: g.id,
      name: g.name,
      email: g.email || '',
      phone: g.phone || '',
      nationality: g.nationality || '',
      documentType: g.documentType || '',
      documentNumber: g.documentNumber || '',
      totalReservations: g._count?.reservations || 0,
      lastStay: g.reservations?.[0] ? formatDate(g.reservations[0].checkIn) : '',
    }));

    const csv = toCSV(rows, headers);
    const date = formatDate(new Date());

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kambelleh_huespedes_${date}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// GET /api/exports/rooms
router.get('/rooms', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });

    const headers = ['number', 'name', 'type', 'floor', 'capacity', 'pricePerNight', 'status'];

    const rows = rooms.map(r => ({
      number: r.number,
      name: r.name,
      type: r.type,
      floor: r.floor,
      capacity: r.capacity,
      pricePerNight: Number(r.pricePerNight).toFixed(2),
      status: r.status,
    }));

    const csv = toCSV(rows, headers);
    const date = formatDate(new Date());

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kambelleh_habitaciones_${date}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;