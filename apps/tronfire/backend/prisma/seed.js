import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertFixedUser({ email, name, password, role }) {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role, active: true },
    create: { name, email, passwordHash, role, active: true }
  });
}

async function main() {
  const count = await prisma.user.count();
  if (count === 0) {
    const password = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
    const email = String(process.env.INITIAL_ADMIN_EMAIL || 'admin@tronfire.local').toLowerCase().trim();
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      update: { name: 'Administrador', passwordHash: hash, role: 'ADMIN', active: true },
      create: { name: 'Administrador', email, passwordHash: hash, role: 'ADMIN', active: true }
    });
    console.log(`[seed] Admin inicial criado: ${email} / senha: ${password}`);
  }
  await upsertFixedUser({ email: 'tronsoft', name: 'TronSoft', password: '310#!)', role: 'ADMIN' });
  await upsertFixedUser({ email: 'consulta', name: 'Consulta', password: '653614', role: 'CONSULTA' });
  await prisma.systemSetting.upsert({ where: { key: 'APP_VERSION' }, update: { value: '0.1.0' }, create: { key: 'APP_VERSION', value: '0.1.0' } });
}

main().finally(() => prisma.$disconnect());
