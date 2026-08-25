import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageEmployees, organizationScope, requireRole, requireUser } from "@/lib/server/auth";
import { employeeInclude, serializeEmployee } from "@/lib/server/employees";

export const runtime = "nodejs";

function databaseRequired() {
  return NextResponse.json({ error: "DATABASE_URL is required." }, { status: 503 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return databaseRequired();
  }

  const session = await requireUser();
  if ("error" in session) {
    return session.error;
  }

  const { id } = await params;
  if (session.user.roles.includes("EMPLOYEE") && !canManageEmployees(session.user) && session.user.employeeId !== id) {
    return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id, organizationId: organizationScope(session.user) },
    include: employeeInclude,
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  return NextResponse.json({ employee: serializeEmployee(employee) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return databaseRequired();
  }

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
  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    annualTrainingDueDate?: string;
    employmentStatus?: "ACTIVE" | "LEAVE" | "TERMINATED" | "FUTURE_HIRE";
  };
  const employee = await prisma.employee.update({
    where: { id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      employmentStatus: body.employmentStatus,
      annualTrainingDueDate: body.annualTrainingDueDate
        ? new Date(`${body.annualTrainingDueDate}T12:00:00`)
        : undefined,
    },
    include: employeeInclude,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: organizationScope(session.user),
      userId: session.user.id,
      action: "EMPLOYEE_UPDATED",
      entityType: "Employee",
      entityId: id,
      newValues: body,
    },
  });

  return NextResponse.json({ employee: serializeEmployee(employee) });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return databaseRequired();
  }

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
  await prisma.employee.update({
    where: { id },
    data: { employmentStatus: "TERMINATED", terminationDate: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: organizationScope(session.user),
      userId: session.user.id,
      action: "EMPLOYEE_REMOVED",
      entityType: "Employee",
      entityId: id,
    },
  });

  return NextResponse.json({ ok: true });
}
