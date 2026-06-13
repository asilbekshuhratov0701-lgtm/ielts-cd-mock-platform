import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 * Reuses one instance in dev to avoid exhausting connections on HMR; in production
 * (serverless) connection pooling is handled by the Neon/PgBouncer pooler via DATABASE_URL.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-export generated types/enums so the rest of the monorepo imports them from here.
export * from "@prisma/client";
export { PrismaClient };
