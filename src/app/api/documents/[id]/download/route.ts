import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageEmployees, requireUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireUser();
  if ("error" in session) {
    return session.error;
  }

  const { id } = await params;
  const document = await prisma.document.findFirst({
    where: { id, organizationId: session.user.organizationId, archivedAt: null },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (
    session.user.roles.includes("EMPLOYEE") &&
    !canManageEmployees(session.user) &&
    document.employeeId !== session.user.employeeId
  ) {
    return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  }

  const blob = await get(document.storagePath, { access: "private" });
  if (!blob || blob.statusCode !== 200) {
    return NextResponse.json({ error: "Document file is unavailable." }, { status: 404 });
  }

  return new Response(blob.stream, {
    headers: {
      "Content-Type": document.mimeType || blob.blob.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${document.fileName.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
