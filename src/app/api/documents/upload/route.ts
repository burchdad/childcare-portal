import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024;
const DEFAULT_ORGANIZATION_ID = "org-ghost-kilgore";

function cleanPathPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return errorResponse("DATABASE_URL is required before document metadata can be saved.", 503);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return errorResponse("BLOB_READ_WRITE_TOKEN is required before documents can be uploaded.", 503);
  }

  const form = await request.formData();
  const file = form.get("file");
  const employeeId = String(form.get("employeeId") ?? "").trim();
  const documentType = String(form.get("documentName") ?? "Training certificate").trim();
  const uploadedBy = String(form.get("uploadedBy") ?? "Dashboard user").trim();

  if (!(file instanceof File) || file.size === 0) {
    return errorResponse("Choose a document file before uploading.", 400);
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    return errorResponse("Document uploads are limited to 25 MB.", 413);
  }

  const employee = employeeId
    ? await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, organizationId: true, firstName: true, lastName: true },
      })
    : null;

  if (employeeId && !employee) {
    return errorResponse("That employee is not in the production roster yet. Run the seed script or add the employee first.", 404);
  }

  const organizationId = employee?.organizationId ?? DEFAULT_ORGANIZATION_ID;
  const safeEmployee = cleanPathPart(employeeId || "unassigned");
  const safeName = cleanPathPart(file.name || "document");
  const pathname = `organizations/${organizationId}/employees/${safeEmployee}/${Date.now()}-${safeName}`;

  let blob: Awaited<ReturnType<typeof put>> | null = null;

  try {
    blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: true,
    });

    const document = await prisma.document.create({
      data: {
        organizationId,
        employeeId: employee?.id,
        documentType: documentType || "Training certificate",
        fileName: file.name || "document",
        storagePath: blob.pathname,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        uploadedBy: uploadedBy || "Dashboard user",
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        action: "DOCUMENT_UPLOADED",
        entityType: "Document",
        entityId: document.id,
        newValues: {
          documentId: document.id,
          documentType: document.documentType,
          employeeId: document.employeeId,
          fileName: document.fileName,
          fileSize: document.fileSize,
          storagePath: document.storagePath,
        },
      },
    });

    return NextResponse.json({
      blob: {
        pathname: blob.pathname,
        contentType: blob.contentType,
        size: file.size,
      },
      document,
    });
  } catch (error) {
    if (blob) {
      await del(blob.url).catch(() => undefined);
    }

    console.error("Document upload failed", error);
    return errorResponse("Document upload failed before it could be audited.", 500);
  }
}
