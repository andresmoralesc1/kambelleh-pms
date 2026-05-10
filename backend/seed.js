import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@kambelleh.com' } });
  if (!existing) {
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: { name: 'Admin', email: 'admin@kambelleh.com', password: hashed, role: 'ADMIN' },
    });
    console.log('Admin created');
  } else {
    console.log('Admin exists');
  }

  const roomCount = await prisma.room.count();
  if (roomCount === 0) {
    const roomTypes = [
      { type: 'STANDARD', basePrice: 80 },
      { type: 'DELUXE', basePrice: 120 },
      { type: 'SUITE', basePrice: 200 },
    ];
    for (let i = 1; i <= 10; i++) {
      const rt = roomTypes[(i - 1) % 3];
      await prisma.room.create({
        data: {
          number: String(i).padStart(3, '0'),
          name: `${rt.type} ${i}`,
          type: rt.type,
          basePrice: rt.basePrice,
          status: 'AVAILABLE',
        },
      });
    }
    console.log('10 rooms created');
  } else {
    console.log(`${roomCount} rooms exist`);
  }

  const guestCount = await prisma.guest.count();
  if (guestCount === 0) {
    const guests = [
      { name: 'Juan Pérez', email: 'juan@example.com', phone: '+54 11 1234 5678', documentType: 'DNI', documentNumber: '12345678' },
      { name: 'María García', email: 'maria@example.com', phone: '+54 11 8765 4321', documentType: 'PASSPORT', documentNumber: 'AB123456' },
      { name: 'Carlos López', email: 'carlos@example.com', phone: '+54 11 5555 1234', documentType: 'DNI', documentNumber: '87654321' },
    ];
    for (const g of guests) await prisma.guest.create({ data: g });
    console.log('3 guests created');
  }

  console.log('Seed done');
  await prisma.$disconnect();
}

seed().catch(console.error);