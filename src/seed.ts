import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── SUPER ADMIN ─────────────────────────────────────────────────────────────
  const superAdminEmail = process.env.SEED_ADMIN_EMAIL || "admin@restaurant.com";
  const superAdminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin1234!";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (existingAdmin) {
    console.log(`⏭️  Super admin already exists (${superAdminEmail}) — skipping`);
  } else {
    const passwordHash = await bcrypt.hash(superAdminPassword, 12);

    await prisma.$transaction(async (tx) => {
      const admin = await tx.user.create({
        data: {
          name: "Super Admin",
          email: superAdminEmail,
          password: passwordHash,
          role: "SUPER_ADMIN",
          isActive: true,
        },
      });
      await tx.userRoleRecord.create({
        data: {
          userId: admin.id,
          role: "SUPER_ADMIN",
          restaurantId: null,
        },
      });
    });

    console.log(`✅ Created super admin: ${superAdminEmail}`);
    console.log(`   Password: ${superAdminPassword}`);
    console.log(`   ⚠️  Change this password immediately after first login!`);
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
