import { NextResponse } from "next/server";
import { getCertificationState } from "@/lib/compliance";
import { prisma } from "@/lib/prisma";
import { organizationScope, requireRole } from "@/lib/server/auth";
import { upsertCertificationSchema } from "@/lib/server/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const parsed = upsertCertificationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const organizationId = organizationScope(session.user);
  const existing = await prisma.certification.findFirst({
    where: {
      organizationId,
      employeeId: data.employeeId,
      certificationType: data.certificationType,
    },
  });
  const status = getCertificationState(data.expirationDate);
  const certification = existing
    ? await prisma.certification.update({
        where: { id: existing.id },
        data: { ...data, status },
      })
    : await prisma.certification.create({
        data: { ...data, organizationId, status },
      });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: session.user.id,
      action: "CERTIFICATION_UPSERTED",
      entityType: "Certification",
      entityId: certification.id,
      newValues: certification,
    },
  });

  return NextResponse.json({ certification });
}
