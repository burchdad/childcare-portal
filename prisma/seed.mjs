import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const organizationId = "org-ghost-kilgore";
const locationId = "loc-kilgore";

const roles = [
  { id: "role-caregiver", name: "Caregiver", requiredHours: 24, instructorLedHours: 5 },
  { id: "role-assistant-director", name: "Assistant Director", requiredHours: 24, instructorLedHours: 5 },
  { id: "role-director", name: "Director", requiredHours: 30, instructorLedHours: 8 },
  { id: "role-cook", name: "Cook", requiredHours: 24, instructorLedHours: 5 },
  { id: "role-substitute", name: "Substitute", requiredHours: 24, instructorLedHours: 5 },
];

const employees = [
  {
    id: "emp-101",
    firstName: "Jane",
    lastName: "Smith",
    jobRoleId: "role-caregiver",
    annualTrainingDueDate: "2026-09-12",
    cprExpirationDate: "2026-08-20",
    firstAidExpirationDate: "2027-01-31",
  },
  {
    id: "emp-102",
    firstName: "Mike",
    lastName: "Jones",
    jobRoleId: "role-assistant-director",
    annualTrainingDueDate: "2026-09-30",
    cprExpirationDate: "2027-04-02",
    firstAidExpirationDate: "2027-04-02",
  },
  {
    id: "emp-103",
    firstName: "Sarah",
    lastName: "Alvarez",
    jobRoleId: "role-caregiver",
    annualTrainingDueDate: "2026-11-15",
    cprExpirationDate: "2027-06-01",
    firstAidExpirationDate: "2027-06-01",
  },
  {
    id: "emp-104",
    firstName: "Milly",
    lastName: "Jacobs",
    jobRoleId: "role-director",
    annualTrainingDueDate: "2026-10-06",
    cprExpirationDate: "2026-10-14",
    firstAidExpirationDate: "2026-10-14",
  },
  {
    id: "emp-105",
    firstName: "Abigail",
    lastName: "Stroman",
    jobRoleId: "role-caregiver",
    annualTrainingDueDate: "2026-09-25",
    firstAidExpirationDate: "2027-03-19",
  },
];

function date(value) {
  return value ? new Date(`${value}T12:00:00-05:00`) : null;
}

function certificationStatus(expirationDate) {
  if (!expirationDate) {
    return "MISSING";
  }

  const today = new Date("2026-08-25T12:00:00-05:00");
  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / 86_400_000);

  if (daysUntilExpiration < 0) {
    return "EXPIRED";
  }

  return daysUntilExpiration <= 60 ? "EXPIRING" : "VALID";
}

async function main() {
  await prisma.organization.upsert({
    where: { id: organizationId },
    update: {
      name: "Ghost AI Solutions",
      legalName: "Ghost AI Solutions",
      timezone: "America/Chicago",
      status: "ACTIVE",
    },
    create: {
      id: organizationId,
      name: "Ghost AI Solutions",
      legalName: "Ghost AI Solutions",
      timezone: "America/Chicago",
      status: "ACTIVE",
    },
  });

  await prisma.location.upsert({
    where: { id: locationId },
    update: {
      name: "Kilgore Site",
      city: "Kilgore",
      state: "TX",
      timezone: "America/Chicago",
      status: "ACTIVE",
    },
    create: {
      id: locationId,
      organizationId,
      name: "Kilgore Site",
      city: "Kilgore",
      state: "TX",
      timezone: "America/Chicago",
      status: "ACTIVE",
    },
  });

  for (const role of roles) {
    await prisma.jobRole.upsert({
      where: { id: role.id },
      update: {
        name: role.name,
        active: true,
      },
      create: {
        id: role.id,
        organizationId,
        name: role.name,
        active: true,
      },
    });
  }

  const ruleSet = await prisma.complianceRuleSet.upsert({
    where: { id: "ruleset-texas-2026" },
    update: {
      active: true,
      effectiveDate: date("2026-01-01"),
      jurisdiction: "Texas",
      name: "Texas Child Care Requirements 2026",
      version: "2026.1",
    },
    create: {
      id: "ruleset-texas-2026",
      organizationId,
      active: true,
      effectiveDate: date("2026-01-01"),
      jurisdiction: "Texas",
      name: "Texas Child Care Requirements 2026",
      version: "2026.1",
    },
  });

  for (const role of roles) {
    await prisma.complianceRequirement.upsert({
      where: { id: `req-annual-${role.id}` },
      update: {
        requiredHours: role.requiredHours,
        minimumInstructorLedHours: role.instructorLedHours,
      },
      create: {
        id: `req-annual-${role.id}`,
        ruleSetId: ruleSet.id,
        jobRoleId: role.id,
        requirementType: "ANNUAL_TRAINING",
        requiredHours: role.requiredHours,
        minimumInstructorLedHours: role.instructorLedHours,
        frequency: "ANNUAL",
        required: true,
      },
    });
  }

  for (const employee of employees) {
    await prisma.employee.upsert({
      where: { id: employee.id },
      update: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        primaryLocationId: locationId,
        jobRoleId: employee.jobRoleId,
        annualTrainingDueDate: date(employee.annualTrainingDueDate),
        employmentStatus: "ACTIVE",
      },
      create: {
        id: employee.id,
        organizationId,
        primaryLocationId: locationId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        hireDate: date("2025-08-25"),
        jobRoleId: employee.jobRoleId,
        annualTrainingDueDate: date(employee.annualTrainingDueDate),
        employmentStatus: "ACTIVE",
      },
    });

    for (const certification of [
      ["CPR", employee.cprExpirationDate],
      ["FIRST_AID", employee.firstAidExpirationDate],
    ]) {
      const [certificationType, expirationValue] = certification;
      const expirationDate = date(expirationValue);

      await prisma.certification.upsert({
        where: { id: `cert-${employee.id}-${certificationType.toLowerCase()}` },
        update: {
          expirationDate,
          status: certificationStatus(expirationDate),
        },
        create: {
          id: `cert-${employee.id}-${certificationType.toLowerCase()}`,
          organizationId,
          employeeId: employee.id,
          certificationType,
          expirationDate,
          status: certificationStatus(expirationDate),
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: "SEED_KILGORE_WORKSPACE",
      entityType: "Organization",
      entityId: organizationId,
      newValues: {
        location: "Kilgore, Texas",
        employees: employees.length,
      },
    },
  });
}

main()
  .then(async () => {
    console.log("Seeded Ghost AI Solutions Kilgore workspace.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
