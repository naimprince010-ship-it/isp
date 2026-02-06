import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { phone: '01700000000' },
    update: {},
    create: {
      phone: '01700000000',
      email: 'admin@isp.local',
      passwordHash: adminHash,
      name: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log('Admin user:', admin.phone);

  const packages = [
    { name: '5 Mbps', speedMbps: 5, price: 500, validityDays: 30 },
    { name: '10 Mbps', speedMbps: 10, price: 800, validityDays: 30 },
    { name: '20 Mbps', speedMbps: 20, price: 1200, validityDays: 30 },
  ];
  for (const p of packages) {
    const existing = await prisma.package.findFirst({ where: { name: p.name } });
    if (!existing) await prisma.package.create({ data: p });
  }
  console.log('Seed packages created.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
