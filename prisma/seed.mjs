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

const trainingTotals = {
  "emp-101": { annual: 16, instructorLed: 3 },
  "emp-102": { annual: 22, instructorLed: 5 },
  "emp-103": { annual: 26, instructorLed: 6 },
  "emp-104": { annual: 29, instructorLed: 7 },
  "emp-105": { annual: 18, instructorLed: 2 },
};

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

    const totals = trainingTotals[employee.id];
    if (totals) {
      await prisma.employeeTrainingRecord.upsert({
        where: { id: `training-${employee.id}-annual` },
        update: {
          hours: totals.annual,
          status: "APPROVED",
          trainingDeliveryType: "ONLINE",
        },
        create: {
          id: `training-${employee.id}-annual`,
          organizationId,
          employeeId: employee.id,
          courseNameSnapshot: "Seeded annual training history",
          trainingDate: date("2026-08-01"),
          hours: totals.annual,
          trainingDeliveryType: "ONLINE",
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });

      await prisma.employeeTrainingRecord.upsert({
        where: { id: `training-${employee.id}-instructor` },
        update: {
          hours: totals.instructorLed,
          status: "APPROVED",
          trainingDeliveryType: "INSTRUCTOR_LED",
        },
        create: {
          id: `training-${employee.id}-instructor`,
          organizationId,
          employeeId: employee.id,
          courseNameSnapshot: "Seeded instructor-led training history",
          trainingDate: date("2026-08-15"),
          hours: totals.instructorLed,
          trainingDeliveryType: "INSTRUCTOR_LED",
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });
    }
  }

  const director = await prisma.userProfile.upsert({
    where: { email: "director@ghostaisolutions.com" },
    update: {
      firstName: "Sarah",
      lastName: "Jones",
      organizationId,
      status: "ACTIVE",
    },
    create: {
      id: "user-director",
      organizationId,
      firstName: "Sarah",
      lastName: "Jones",
      email: "director@ghostaisolutions.com",
      status: "ACTIVE",
    },
  });

  const auditor = await prisma.userProfile.upsert({
    where: { email: "auditor@ghostaisolutions.com" },
    update: {
      firstName: "Taylor",
      lastName: "Audit",
      organizationId,
      status: "ACTIVE",
    },
    create: {
      id: "user-auditor",
      organizationId,
      firstName: "Taylor",
      lastName: "Audit",
      email: "auditor@ghostaisolutions.com",
      status: "ACTIVE",
    },
  });

  const jane = await prisma.userProfile.upsert({
    where: { email: "jane.smith@ghostaisolutions.com" },
    update: {
      firstName: "Jane",
      lastName: "Smith",
      organizationId,
      employeeId: "emp-101",
      status: "ACTIVE",
    },
    create: {
      id: "user-jane-smith",
      organizationId,
      employeeId: "emp-101",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@ghostaisolutions.com",
      status: "ACTIVE",
    },
  });

  for (const assignment of [
    { id: "assignment-director", userId: director.id, role: "LOCATION_DIRECTOR" },
    { id: "assignment-auditor", userId: auditor.id, role: "AUDITOR" },
    { id: "assignment-jane", userId: jane.id, role: "EMPLOYEE" },
  ]) {
    await prisma.userRoleAssignment.upsert({
      where: { id: assignment.id },
      update: {
        role: assignment.role,
        locationId,
      },
      create: {
        id: assignment.id,
        userId: assignment.userId,
        organizationId,
        locationId,
        role: assignment.role,
      },
    });
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
