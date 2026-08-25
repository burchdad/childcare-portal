import { NextResponse } from "next/server";
import { getCertificationState } from "@/lib/compliance";
import { prisma } from "@/lib/prisma";
import { organizationScope, requireRole } from "@/lib/server/auth";
import { DEFAULT_LOCATION_ID } from "@/lib/server/constants";

export const runtime = "nodejs";

type MappedImportRow = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  annualDueDate: string;
  completedHours?: string;
  instructorLedHours?: string;
  cprExpirationDate?: string;
  firstAidExpirationDate?: string;
};

function date(value?: string) {
  return value ? new Date(`${value}T12:00:00`) : undefined;
}

function hours(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const organizationId = organizationScope(session.user);
  const batch = await prisma.workbookImportBatch.findFirst({
    where: { id, organizationId },
    include: { rows: { where: { status: "READY" }, orderBy: { rowNumber: "asc" } } },
  });

  if (!batch) {
    return NextResponse.json({ error: "Import batch not found." }, { status: 404 });
  }

  if (batch.status === "COMMITTED") {
    return NextResponse.json({ error: "Import batch is already committed." }, { status: 409 });
  }

  let committed = 0;

  for (const row of batch.rows) {
    const mapped = row.mapped as MappedImportRow;
    const role = await prisma.jobRole.findFirst({
      where: {
        organizationId,
        name: { equals: mapped.role || "Caregiver", mode: "insensitive" },
        active: true,
      },
    });

    if (!role) {
      await prisma.workbookImportRow.update({
        where: { id: row.id },
        data: { status: "ERROR", errors: ["Role was not found during commit."] },
      });
      continue;
    }

    const employee = await prisma.employee.create({
      data: {
        organizationId,
        primaryLocationId: DEFAULT_LOCATION_ID,
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        email: mapped.email || null,
        phone: mapped.phone || null,
        hireDate: new Date(),
        annualTrainingDueDate: date(mapped.annualDueDate),
        jobRoleId: role.id,
      },
    });

    const annualHours = hours(mapped.completedHours);
    const instructorHours = hours(mapped.instructorLedHours);

    if (annualHours > 0) {
      await prisma.employeeTrainingRecord.create({
        data: {
          organizationId,
          employeeId: employee.id,
          courseNameSnapshot: "Workbook migrated annual training",
          trainingDate: new Date(),
          hours: annualHours,
          trainingDeliveryType: "ONLINE",
          status: "APPROVED",
          submittedBy: session.user.id,
          approvedBy: session.user.id,
          approvedAt: new Date(),
        },
      });
    }

    if (instructorHours > 0) {
      await prisma.employeeTrainingRecord.create({
        data: {
          organizationId,
          employeeId: employee.id,
          courseNameSnapshot: "Workbook migrated instructor-led training",
          trainingDate: new Date(),
          hours: instructorHours,
          trainingDeliveryType: "INSTRUCTOR_LED",
          status: "APPROVED",
          submittedBy: session.user.id,
          approvedBy: session.user.id,
          approvedAt: new Date(),
        },
      });
    }

    for (const [certificationType, expirationDate] of [
      ["CPR", date(mapped.cprExpirationDate)],
      ["FIRST_AID", date(mapped.firstAidExpirationDate)],
    ] as const) {
      await prisma.certification.create({
        data: {
          organizationId,
          employeeId: employee.id,
          certificationType,
          expirationDate,
          status: getCertificationState(expirationDate),
        },
      });
    }

    await prisma.workbookImportRow.update({
      where: { id: row.id },
      data: { status: "COMMITTED" },
    });
    committed += 1;
  }

  await prisma.workbookImportBatch.update({
    where: { id: batch.id },
    data: { status: "COMMITTED", committedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: session.user.id,
      action: "WORKBOOK_IMPORT_COMMITTED",
      entityType: "WorkbookImportBatch",
      entityId: batch.id,
      newValues: { committed },
    },
  });

  return NextResponse.json({ committed });
}
