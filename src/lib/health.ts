// Is the one data store reachable? Lives in the service layer rather than in
// the route so the API layer keeps depending on services, not on the Prisma
// client directly.

// The Prisma client is imported lazily: constructing it needs DATABASE_URL, and
// the self-check below injects its own probe instead of touching a database.
async function pingPrisma(): Promise<unknown> {
  const { prisma } = await import("./prisma");
  return prisma.$queryRaw`SELECT 1`;
}

export type DbHealth = { db: "up" | "down"; latencyMs: number };

/** Never throws - an unreachable database is an answer, not an error. */
export async function checkDb(
  probe: () => Promise<unknown> = pingPrisma,
): Promise<DbHealth> {
  const started = Date.now();
  try {
    await probe();
    return { db: "up", latencyMs: Date.now() - started };
  } catch {
    return { db: "down", latencyMs: Date.now() - started };
  }
}
