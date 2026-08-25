import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { organizationScope, requireRole } from "@/lib/server/auth";
import { createTrainingRecordSchema } from "@/lib/server/validators";

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

  const records = await prisma.employeeTrainingRecord.findMany({
    where: { organizationId: organizationScope(session.user) },
    orderBy: { trainingDate: "desc" },
    take: 250,
  });

  return NextResponse.json({ records });
}

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

  const parsed = createTrainingRecordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const organizationId = organizationScope(session.user);
  const record = await prisma.employeeTrainingRecord.create({
    data: {
      organizationId,
      employeeId: data.employeeId,
      courseNameSnapshot: data.courseName,
      providerSnapshot: data.provider,
      trainingDate: data.trainingDate ?? new Date(),
      hours: data.hours,
      trainingDeliveryType: data.trainingDeliveryType,
      competencyCategory: data.competencyCategory,
      status: "APPROVED",
      submittedBy: session.user.id,
      approvedBy: session.user.id,
      approvedAt: new Date(),
      notes: data.notes,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: session.user.id,
      action: "TRAINING_APPROVED",
      entityType: "EmployeeTrainingRecord",
      entityId: record.id,
      newValues: record,
    },
  });

  return NextResponse.json({ record }, { status: 201 });
}
