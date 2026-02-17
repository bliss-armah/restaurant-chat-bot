import { PrismaClient } from "@prisma/client";

// Prisma 7: Connection configured via DATABASE_URL environment variable
export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
