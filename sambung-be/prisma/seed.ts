import { prisma } from "../src/db/prisma.ts";
import { digest } from "../src/modules/auth/session.ts";

if (process.env.OTP_MODE !== "demo" || process.env.NODE_ENV === "production") {
  throw new Error("Seed hanya tersedia di lingkungan demo.");
}
try {
  await prisma.account.createMany({ skipDuplicates: true, data: [
    { phone: "6281234567890", role: "petani", name: "Sari" },
    { phone: "6281398765432", role: "pembeli", name: "Budi" },
    { phone: "6281398765433", role: "pembeli", name: "Rina" },
    { phone: "6280000000000", email: "admin@sambung.id", passwordHash: digest("admin123"), role: "admin", name: "Pengawas Sistem" },
  ].map(person => ({ ...person, province: "Jawa Timur", regency: "Jember", district: "Sumbersari" })) });

  await prisma.systemParameter.upsert({
    where: { id: "active" },
    update: {},
    create: {
      id: "active",
      orderExpiryHours: 24,
      fairPriceToleranceDelta: 0.03,
      rendemenGKP: 0.5338,
      rendemenGKG: 0.6274,
      governmentFloorPriceGKP: 6500,
    },
  });
} finally {
  await prisma.$disconnect();
}
