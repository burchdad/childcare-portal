import type { Prisma } from "@prisma/client";
import { evaluateEmployeeCompliance } from "@/lib/compliance";
import { DEFAULT_LOCATION_LABEL } from "@/lib/server/constants";

const employeeInclude = {
  primaryLocation: true,
  jobRole: {
    include: {
      requirements: {
        where: { requirementType: "ANNUAL_TRAINING", required: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  },
  trainingRecords: {
    where: { status: "APPROVED" },
    orderBy: { trainingDate: "desc" },
  },
  certifications: {
    orderBy: { updatedAt: "desc" },
  },
  documents: {
    where: { archivedAt: null },
    orderBy: { uploadedAt: "desc" },
  },
  alerts: {
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.EmployeeInclude;

export type EmployeeWithCompliance = Prisma.EmployeeGetPayload<{
  include: typeof employeeInclude;
}>;

export { employeeInclude };

function numberFromDecimal(value: Prisma.Decimal | number | null | undefined) {
  return value === null || value === undefined ? 0 : Number(value);
}

function latestCertification(
  employee: EmployeeWithCompliance,
  certificationType: "CPR" | "FIRST_AID",
) {
  return employee.certifications.find((item) => item.certificationType === certificationType);
}

export function employeeRequirement(employee: EmployeeWithCompliance) {
  const requirement = employee.jobRole.requirements[0];

  return {
    requiredHours: numberFromDecimal(requirement?.requiredHours) || 24,
    requiredInstructorLedHours:
      numberFromDecimal(requirement?.minimumInstructorLedHours) || 5,
  };
}

export function employeeTrainingTotals(employee: EmployeeWithCompliance) {
  return employee.trainingRecords.reduce(
    (totals, record) => {
      const hours = numberFromDecimal(record.hours);
      totals.completedHours += hours;

      if (
        record.trainingDeliveryType === "INSTRUCTOR_LED" ||
        record.trainingDeliveryType === "IN_PERSON"
      ) {
        totals.completedInstructorLedHours += hours;
      }

      return totals;
    },
    { completedHours: 0, completedInstructorLedHours: 0 },
  );
}

export function serializeEmployee(employee: EmployeeWithCompliance) {
  const requirement = employeeRequirement(employee);
  const totals = employeeTrainingTotals(employee);
  const cpr = latestCertification(employee, "CPR");
  const firstAid = latestCertification(employee, "FIRST_AID");
  const compliance = evaluateEmployeeCompliance({
    ...requirement,
    ...totals,
    annualDueDate: employee.annualTrainingDueDate ?? undefined,
    cprExpirationDate: cpr?.expirationDate ?? undefined,
    firstAidExpirationDate: firstAid?.expirationDate ?? undefined,
    employmentStatus: employee.employmentStatus,
  });

  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    name: `${employee.firstName} ${employee.lastName}`,
    email: employee.email,
    phone: employee.phone,
    location: employee.primaryLocation
      ? `${employee.primaryLocation.city ?? employee.primaryLocation.name}, ${
          employee.primaryLocation.state ?? "TX"
        }`
      : DEFAULT_LOCATION_LABEL,
    locationName: employee.primaryLocation?.name ?? "Kilgore Site",
    role: employee.jobRole.name,
    jobRoleId: employee.jobRoleId,
    hireDate: employee.hireDate,
    employmentStatus: employee.employmentStatus,
    annualDueDate: employee.annualTrainingDueDate,
    requiredHours: requirement.requiredHours,
    completedHours: totals.completedHours,
    requiredInstructorLedHours: requirement.requiredInstructorLedHours,
    completedInstructorLedHours: totals.completedInstructorLedHours,
    cprExpirationDate: cpr?.expirationDate,
    firstAidExpirationDate: firstAid?.expirationDate,
    compliance,
    trainingRecords: employee.trainingRecords,
    certifications: employee.certifications,
    documents: employee.documents,
    alerts: employee.alerts,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}
