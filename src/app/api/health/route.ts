import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.$queryRaw`SELECT 1`;
    }

    return Response.json({
      status: "healthy",
      database: process.env.DATABASE_URL ? "reachable" : "not_configured",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        status: "unhealthy",
        database: "unreachable",
        message: error instanceof Error ? error.message : "Unknown health check error",
      },
      { status: 503 },
    );
  }
}
