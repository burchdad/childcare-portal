import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { organizationScope, requireRole } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireRole([
    "PLATFORM_ADMIN",
    "ORG_OWNER",
    "CORPORATE_ADMIN",
    "LOCATION_DIRECTOR",
    "ASSISTANT_DIRECTOR",
    "COMPLIANCE_MANAGER",
    "AUDITOR",
  ]);
  if ("error" in session) {
    return session.error;
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: { organizationId: organizationScope(session.user) },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ auditLogs });
}
