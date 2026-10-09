import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { AuthMethod, Role, PrismaClient } from '../src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SUPERADMIN_EMAIL?.toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env');
  }

  await prisma.user.upsert({
    where: { email },
    update: {}, // never overwrite an existing superadmin
    create: {
      email,
      password: await bcrypt.hash(password, 12),
      authType: AuthMethod.EMAIL_AND_PASSWORD,
      role: Role.SUPERADMIN
    },
  });
  console.log(`Superadmin ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());



