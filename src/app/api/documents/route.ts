import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageEmployees, organizationScope, requireRole, requireUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireUser();
  if ("error" in session) {
    return session.error;
  }

  const where =
    session.user.roles.includes("EMPLOYEE") && !canManageEmployees(session.user)
      ? { organizationId: session.user.organizationId, employeeId: session.user.employeeId }
      : { organizationId: organizationScope(session.user) };

  const documents = await prisma.document.findMany({
    where: { ...where, archivedAt: null },
    include: {
      employee: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { uploadedAt: "desc" },
    take: 250,
  });

  return NextResponse.json({ documents });
}

export async function DELETE(request: Request) {
  const session = await requireRole([
    "PLATFORM_ADMIN",
    "ORG_OWNER",
    "CORPORATE_ADMIN",
    "LOCATION_DIRECTOR",
    "ASSISTANT_DIRECTOR",
    "COMPLIANCE_MANAGER",
  ]);
  if ("error" in session) {
    return session.error;
  }

  const { id } = (await request.json()) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "Document id is required." }, { status: 400 });
  }

  const document = await prisma.document.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: organizationScope(session.user),
      userId: session.user.id,
      action: "DOCUMENT_ARCHIVED",
      entityType: "Document",
      entityId: document.id,
      oldValues: document,
    },
  });

  return NextResponse.json({ ok: true });
}
