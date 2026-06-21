import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

type SeedUser = {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} before running the local test seed.`);
  return value;
}

async function upsertSeedUser(input: SeedUser) {
  if (!input.password || input.password.length < 12) {
    throw new Error(`The seed password for ${input.email} must contain at least 12 characters.`);
  }

  const passwordHash = await hash(input.password, 12);
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      emailVerified: new Date(),
      passwordHash,
    },
    create: {
      name: input.name,
      email: input.email,
      role: input.role,
      emailVerified: new Date(),
      passwordHash,
    },
  });
}

async function main() {
  if (process.env.ALLOW_LOCAL_TEST_SEED !== "true") {
    throw new Error("Set ALLOW_LOCAL_TEST_SEED=true to acknowledge that these are disposable local test accounts.");
  }

  const admin = await upsertSeedUser({
    name: "Local Test Administrator",
    email: process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() || "admin.local@allianceaccountant.test",
    password: required("SEED_ADMIN_PASSWORD"),
    role: "ADMIN",
  });
  await upsertSeedUser({
    name: "Local Test Staff",
    email: process.env.SEED_STAFF_EMAIL?.trim().toLowerCase() || "staff.local@allianceaccountant.test",
    password: required("SEED_STAFF_PASSWORD"),
    role: "STAFF",
  });
  const client = await upsertSeedUser({
    name: "Local Test Client",
    email: process.env.SEED_CLIENT_EMAIL?.trim().toLowerCase() || "client.local@allianceaccountant.test",
    password: required("SEED_CLIENT_PASSWORD"),
    role: "CLIENT",
  });

  await prisma.clientProfile.upsert({
    where: { userId: client.id },
    update: { fullName: "Local Test Client", taxYear: 2025, filingType: "Individual", assignedStaffId: admin.id },
    create: { userId: client.id, fullName: "Local Test Client", taxYear: 2025, filingType: "Individual", assignedStaffId: admin.id },
  });
  await prisma.taxReturn.upsert({
    where: { clientId_taxYear: { clientId: client.id, taxYear: 2025 } },
    update: { filingType: "Individual" },
    create: { clientId: client.id, taxYear: 2025, filingType: "Individual", status: "CLIENT_REGISTERED" },
  });

  await prisma.verificationToken.deleteMany({
    where: { OR: [{ expires: { lt: new Date() } }, { identifier: { in: [`reset:${admin.id}`, `reset:${client.id}`] } }] },
  });

  console.log("Local test users seeded: admin, staff, and client.");
}

main().finally(() => prisma.$disconnect());
