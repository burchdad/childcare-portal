import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { organizationScope, requireRole } from "@/lib/server/auth";
import { parseWorkbookText } from "@/lib/server/workbook";

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

  const batches = await prisma.workbookImportBatch.findMany({
    where: { organizationId: organizationScope(session.user) },
    include: { rows: { orderBy: { rowNumber: "asc" }, take: 100 } },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return NextResponse.json({ batches });
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

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a workbook export file." }, { status: 400 });
  }

  const parsed = parseWorkbookText(await file.text());
  const organizationId = organizationScope(session.user);
  const batch = await prisma.workbookImportBatch.create({
    data: {
      organizationId,
      fileName: file.name,
      rowCount: parsed.rowCount,
      validRowCount: parsed.validRowCount,
      errorRowCount: parsed.errorRowCount,
      createdBy: session.user.id,
      rows: {
        create: parsed.rows.map((row) => ({
          rowNumber: row.rowNumber,
          rawValues: row.rawValues,
          mapped: row.mapped,
          errors: row.errors,
          status: row.status,
        })),
      },
    },
    include: { rows: { orderBy: { rowNumber: "asc" } } },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: session.user.id,
      action: "WORKBOOK_IMPORT_STAGED",
      entityType: "WorkbookImportBatch",
      entityId: batch.id,
      newValues: {
        fileName: batch.fileName,
        rowCount: batch.rowCount,
        validRowCount: batch.validRowCount,
        errorRowCount: batch.errorRowCount,
      },
    },
  });

  return NextResponse.json({ batch }, { status: 201 });
}
