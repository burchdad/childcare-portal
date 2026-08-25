import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageEmployees, organizationScope, requireRole, requireUser } from "@/lib/server/auth";
import { DEFAULT_LOCATION_ID } from "@/lib/server/constants";
import { employeeInclude, serializeEmployee } from "@/lib/server/employees";

export const runtime = "nodejs";

function databaseRequired() {
  return NextResponse.json({ error: "DATABASE_URL is required." }, { status: 503 });
}

function splitName(name: string) {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  return { firstName: firstName ?? "", lastName: rest.join(" ") || "Unknown" };
}

async function roleIdFor(organizationId: string, roleNameOrId: string) {
  const role = await prisma.jobRole.findFirst({
    where: {
      organizationId,
      OR: [{ id: roleNameOrId }, { name: { equals: roleNameOrId, mode: "insensitive" } }],
      active: true,
    },
  });

  return role?.id;
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return databaseRequired();
  }

  const session = await requireUser();
  if ("error" in session) {
    return session.error;
  }

  const where =
    session.user.roles.includes("EMPLOYEE") && !canManageEmployees(session.user)
      ? { organizationId: session.user.organizationId, id: session.user.employeeId ?? "" }
      : { organizationId: organizationScope(session.user) };

  const employees = await prisma.employee.findMany({
    where,
    include: employeeInclude,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({ employees: employees.map(serializeEmployee) });
}

export async function POST(request: Request) {
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

  const body = (await request.json()) as {
    name?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    jobRoleId?: string;
    annualDueDate?: string;
    annualTrainingDueDate?: string;
    hireDate?: string;
    email?: string;
    phone?: string;
  };
  const nameParts = body.name ? splitName(body.name) : null;
  const firstName = body.firstName?.trim() || nameParts?.firstName || "";
  const lastName = body.lastName?.trim() || nameParts?.lastName || "";
  const organizationId = organizationScope(session.user);
  const jobRoleId = await roleIdFor(organizationId, body.jobRoleId || body.role || "Caregiver");

  if (!firstName || !lastName || !jobRoleId) {
    return NextResponse.json(
      { error: "firstName, lastName, and a valid job role are required." },
      { status: 400 },
    );
  }

  const employee = await prisma.employee.create({
    data: {
      organizationId,
      primaryLocationId: DEFAULT_LOCATION_ID,
      firstName,
      lastName,
      email: body.email || null,
      phone: body.phone || null,
      hireDate: body.hireDate ? new Date(`${body.hireDate}T12:00:00`) : new Date(),
      annualTrainingDueDate: body.annualTrainingDueDate || body.annualDueDate
        ? new Date(`${body.annualTrainingDueDate || body.annualDueDate}T12:00:00`)
        : null,
      jobRoleId,
    },
    include: employeeInclude,
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: session.user.id,
      action: "EMPLOYEE_CREATED",
      entityType: "Employee",
      entityId: employee.id,
      newValues: { firstName, lastName, jobRoleId },
    },
  });

  return NextResponse.json({ employee: serializeEmployee(employee) }, { status: 201 });
}
