import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if we can insert with a raw enum cast
  try {
    const r = await prisma.$queryRaw`
      INSERT INTO users (id, email, password_hash, name, role, updated_at)
      VALUES (gen_random_uuid(), 'reception@kambelleh.com', 'placeholder', 'Recepcion Kambelleh', 'RECEPTIONIST'::"Role", CURRENT_TIMESTAMP)
      RETURNING id, email, role
    `;
    console.log('Inserted:', JSON.stringify(r));
  } catch (e) {
    console.log('Error inserting:', e.message.slice(0, 300));
  }
}

main().finally(() => prisma.$disconnect());