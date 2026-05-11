import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@kambelleh.com' } });
  if (!existing) {
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: { name: 'Admin', email: 'admin@kambelleh.com', passwordHash: hashed, role: Role.ADMIN },
    });
    console.log('Admin created');
  } else {
    console.log('Admin exists');
  }

  // Create MANAGER user
  const managerExists = await prisma.user.findUnique({ where: { email: 'manager@kambelleh.com' } });
  if (!managerExists) {
    const hashed = await bcrypt.hash('manager123', 10);
    await prisma.user.create({
      data: { name: 'Gerencia Kambelleh', email: 'manager@kambelleh.com', passwordHash: hashed, role: Role.MANAGER },
    });
    console.log('Manager created');
  } else {
    console.log('Manager exists');
  }

  // Create RECEPTIONIST user
  const receptionistExists = await prisma.user.findUnique({ where: { email: 'reception@kambelleh.com' } });
  if (!receptionistExists) {
    const hashed = await bcrypt.hash('recepcion123', 10);
    await prisma.user.create({
      data: { name: 'Recepción Kambelleh', email: 'reception@kambelleh.com', passwordHash: hashed, role: Role.RECEPCIONIST },
    });
    console.log('Receptionist created');
  } else {
    console.log('Receptionist exists');
  }

  // Get users for createdById
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@kambelleh.com' } });
  const managerUser = await prisma.user.findUnique({ where: { email: 'manager@kambelleh.com' } });
  const receptionistUser = await prisma.user.findUnique({ where: { email: 'reception@kambelleh.com' } });

  const roomCount = await prisma.room.count();
  if (roomCount === 0) {
    const rooms = [
      { number: '101', name: 'Standard Interior', type: 'PRIVATE', capacity: 2, pricePerNight: 15000, status: 'AVAILABLE', amenities: ['WiFi', 'A/C', 'TV'], floor: 1 },
      { number: '102', name: 'Standard Vista', type: 'PRIVATE', capacity: 2, pricePerNight: 18000, status: 'AVAILABLE', amenities: ['WiFi', 'A/C', 'TV'], floor: 1 },
      { number: '103', name: 'Doble Superior', type: 'PRIVATE', capacity: 2, pricePerNight: 22000, status: 'AVAILABLE', amenities: ['WiFi', 'A/C', 'TV', 'Desayuno'], floor: 1 },
      { number: '201', name: 'Suite Júnior', type: 'PRIVATE', capacity: 2, pricePerNight: 35000, status: 'AVAILABLE', amenities: ['WiFi', 'A/C', 'TV', 'Desayuno'], floor: 2 },
      { number: '202', name: 'Suite Executive', type: 'PRIVATE', capacity: 3, pricePerNight: 45000, status: 'AVAILABLE', amenities: ['WiFi', 'A/C', 'TV', 'Desayuno'], floor: 2 },
      { number: '203', name: 'Suite Presidencial', type: 'PRIVATE', capacity: 4, pricePerNight: 65000, status: 'AVAILABLE', amenities: ['WiFi', 'A/C', 'TV', 'Desayuno'], floor: 2 },
      { number: '301', name: 'Dormitorio Compartido', type: 'SHARED', capacity: 6, pricePerNight: 6000, status: 'AVAILABLE', amenities: ['WiFi', 'A/C'], floor: 3 },
      { number: '302', name: 'Dormitorio Female', type: 'SHARED', capacity: 4, pricePerNight: 7000, status: 'AVAILABLE', amenities: ['WiFi', 'A/C'], floor: 3 },
    ];
    for (const r of rooms) {
      await prisma.room.create({ data: r });
    }
    console.log(`${rooms.length} rooms created`);
  } else {
    console.log(`${roomCount} rooms exist`);
  }

  const guestCount = await prisma.guest.count();
  if (guestCount === 0) {
    const guests = [
      { name: 'Juan Pérez', email: 'juan.perez@gmail.com', phone: '+54 11 1234 5678', documentType: 'DNI', documentNumber: '32123456', nationality: 'Argentina' },
      { name: 'María García', email: 'maria.garcia@hotmail.com', phone: '+54 11 8765 4321', documentType: 'PASSPORT', documentNumber: 'AB1234567', nationality: 'España' },
      { name: 'Carlos López', email: 'carlos.lopez@yahoo.com', phone: '+54 11 5555 1234', documentType: 'DNI', documentNumber: '45678901', nationality: 'Argentina' },
      { name: 'Ana Martínez', email: 'ana.martinez@gmail.com', phone: '+54 11 9999 8888', documentType: 'DNI', documentNumber: '11223344', nationality: 'México' },
      { name: 'Pedro Sánchez', email: 'pedro.sanchez@gmail.com', phone: '+54 11 2222 3333', documentType: 'ID', documentNumber: 'XA123456', nationality: 'Colombia' },
      { name: 'Laura Torres', email: 'laura.torres@gmail.com', phone: '+54 11 7777 6666', documentType: 'PASSPORT', documentNumber: 'CD789012', nationality: 'Chile' },
    ];
    for (const g of guests) await prisma.guest.create({ data: g });
    console.log(`${guests.length} guests created`);
  } else {
    console.log(`${guestCount} guests exist`);
  }

  const resCount = await prisma.reservation.count();
  if (resCount === 0) {
    const rooms = await prisma.room.findMany();
    const guests = await prisma.guest.findMany();

    const now = new Date();
    const reservations = [
      { guestIndex: 0, roomIndex: 0, checkIn: addDays(now, -10), checkOut: addDays(now, -7), status: 'CHECKED_OUT', adults: 2, children: 0, totalAmount: 45000, adultsExtra: 0 },
      { guestIndex: 1, roomIndex: 1, checkIn: addDays(now, -5), checkOut: addDays(now, -3), status: 'CHECKED_OUT', adults: 2, children: 1, totalAmount: 36000, adultsExtra: 0 },
      { guestIndex: 2, roomIndex: 2, checkIn: addDays(now, -2), checkOut: addDays(now, 1), status: 'CHECKED_IN', adults: 1, children: 0, totalAmount: 66000, adultsExtra: 0 },
      { guestIndex: 3, roomIndex: 3, checkIn: addDays(now, 1), checkOut: addDays(now, 4), status: 'CONFIRMED', adults: 2, children: 2, totalAmount: 105000, adultsExtra: 0 },
      { guestIndex: 4, roomIndex: 4, checkIn: addDays(now, 3), checkOut: addDays(now, 6), status: 'CONFIRMED', adults: 2, children: 0, totalAmount: 135000, adultsExtra: 0 },
      { guestIndex: 5, roomIndex: 5, checkIn: addDays(now, 5), checkOut: addDays(now, 8), status: 'PENDING', adults: 3, children: 1, totalAmount: 195000, adultsExtra: 0 },
      { guestIndex: 0, roomIndex: 0, checkIn: addDays(now, 7), checkOut: addDays(now, 10), status: 'CONFIRMED', adults: 2, children: 0, totalAmount: 45000, adultsExtra: 0 },
      { guestIndex: 2, roomIndex: 6, checkIn: addDays(now, 10), checkOut: addDays(now, 15), status: 'PENDING', adults: 1, children: 0, totalAmount: 30000, adultsExtra: 0 },
    ];

    for (const r of reservations) {
      const res = await prisma.reservation.create({
        data: {
          guestId: guests[r.guestIndex].id,
          roomId: rooms[r.roomIndex].id,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          status: r.status,
          adults: r.adults,
          children: r.children,
          totalAmount: r.totalAmount,
          createdById: adminUser?.id || null,
        },
      });

      // Create payment for non-pending reservations
      if (r.status !== 'PENDING') {
        await prisma.payment.create({
          data: {
            reservationId: res.id,
            amount: r.totalAmount,
            status: 'COMPLETED',
            stripeChargeId: `pi_seed_${res.id.slice(0, 8)}`,
          },
        });
      }
    }
    console.log(`${reservations.length} reservations + payments created`);
  } else {
    console.log(`${resCount} reservations exist`);
  }

  // Seed cleaning logs
  const cleaningLogCount = await prisma.cleaningLog.count();
  if (cleaningLogCount === 0) {
    const rooms = await prisma.room.findMany();
    const staffNames = ['María López', 'Carlos García', 'Ana Martínez', 'Pedro Sánchez'];

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      // Create 1-2 logs per room
      const logCount = i % 2 === 0 ? 2 : 1;
      for (let j = 0; j < logCount; j++) {
        const daysAgo = (i + j) * 2 + 1;
        await prisma.cleaningLog.create({
          data: {
            roomId: room.id,
            performedBy: staffNames[(i + j) % staffNames.length],
            status: 'CLEANED',
            notes: 'Limpieza completa de la habitación',
            createdAt: addDays(new Date(), -daysAgo),
            completedAt: addDays(new Date(), -daysAgo),
          },
        });
      }
      // Set some rooms as needing cleaning or in cleaning
      if (i === 2) {
        await prisma.room.update({ where: { id: room.id }, data: { cleaningStatus: 'NEEDS_CLEANING' } });
      } else if (i === 5) {
        await prisma.room.update({ where: { id: room.id }, data: { cleaningStatus: 'IN_CLEANING' } });
      } else if (i === 7) {
        await prisma.room.update({ where: { id: room.id }, data: { cleaningStatus: 'MAINTENANCE' } });
      }
    }
    console.log(`${rooms.length} rooms with cleaning logs created`);
  } else {
    console.log(`${cleaningLogCount} cleaning logs exist`);
  }

  // Seed internal notes
  const noteCount = await prisma.internalNote.count();
  if (noteCount === 0) {
    const guests = await prisma.guest.findMany({ take: 2 });
    const reservations = await prisma.reservation.findMany({ take: 3 });

    if (guests.length > 0) {
      await prisma.internalNote.create({
        data: {
          content: 'Huésped preferencial, siempre solicita habitación tranquila con vista al jardín.',
          authorName: 'Recepción',
          guestId: guests[0].id,
        },
      });
      console.log('Nota para huésped creada');
    }

    if (guests.length > 1) {
      await prisma.internalNote.create({
        data: {
          content: 'Alergia al polvo. Solicitar limpieza especial con productos hipoalergénicos.',
          authorName: 'María López',
          guestId: guests[1].id,
        },
      });
      console.log('Segunda nota para huésped creada');
    }

    if (reservations.length > 0) {
      await prisma.internalNote.create({
        data: {
          content: 'Cliente VIP -庆祝 anniversary. Preparar champagne en la habitación.',
          authorName: 'Gerencia',
          reservationId: reservations[0].id,
        },
      });
      console.log('Nota para reserva creada');
    }

    if (reservations.length > 1) {
      await prisma.internalNote.create({
        data: {
          content: 'Late check-out solicitado hasta las 16:00. Confirmado con gerencia.',
          authorName: 'Recepción',
          reservationId: reservations[1].id,
        },
      });
    }

    if (reservations.length > 2) {
      await prisma.internalNote.create({
        data: {
          content: 'Equipaje extra хранится в storage. Guests will pick up on departure day.',
          authorName: 'Bellhop',
          reservationId: reservations[2].id,
        },
      });
    }

    console.log('Notas internas de ejemplo creadas');
  } else {
    console.log(`${noteCount} notas internas existen`);
  }

  console.log('Seed done');
  await prisma.$disconnect();
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

seed().catch(console.error);