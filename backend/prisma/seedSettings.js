import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SETTINGS = [
  { key: 'property_name', value: 'Kambelleh' },
  { key: 'property_address', value: '' },
  { key: 'property_phone', value: '' },
  { key: 'property_email', value: '' },
  { key: 'check_in_time', value: '14:00' },
  { key: 'check_out_time', value: '10:00' },
  { key: 'currency', value: 'ARS' },
  { key: 'cancellation_policy', value: 'Flexible' },
  { key: 'services_included', value: 'WiFi, Desayuno, Aire acondicionado' },
];

async function seedSettings() {
  for (const setting of SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value },
    });
  }
  console.log(`${SETTINGS.length} settings seeded/updated`);
  await prisma.$disconnect();
}

seedSettings().catch(console.error);