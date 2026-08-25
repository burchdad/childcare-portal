import { evaluateEmployeeCompliance } from "@/lib/compliance";

export type DemoEmployee = {
  id: string;
  name: string;
  location: string;
  role: string;
  requiredHours: number;
  completedHours: number;
  requiredInstructorLedHours: number;
  completedInstructorLedHours: number;
  annualDueDate?: Date;
  cprExpirationDate?: Date;
  firstAidExpirationDate?: Date;
};

export const today = new Date("2026-08-25T12:00:00-05:00");

export const employees: DemoEmployee[] = [
  {
    id: "emp-101",
    name: "Jane Smith",
    location: "Kilgore, Texas",
    role: "Caregiver",
    requiredHours: 24,
    completedHours: 16,
    requiredInstructorLedHours: 5,
    completedInstructorLedHours: 3,
    annualDueDate: new Date("2026-09-12T12:00:00-05:00"),
    cprExpirationDate: new Date("2026-08-20T12:00:00-05:00"),
    firstAidExpirationDate: new Date("2027-01-31T12:00:00-06:00"),
  },
  {
    id: "emp-102",
    name: "Mike Jones",
    location: "Kilgore, Texas",
    role: "Assistant Director",
    requiredHours: 24,
    completedHours: 22,
    requiredInstructorLedHours: 5,
    completedInstructorLedHours: 5,
    annualDueDate: new Date("2026-09-30T12:00:00-05:00"),
    cprExpirationDate: new Date("2027-04-02T12:00:00-05:00"),
    firstAidExpirationDate: new Date("2027-04-02T12:00:00-05:00"),
  },
  {
    id: "emp-103",
    name: "Sarah Alvarez",
    location: "Kilgore, Texas",
    role: "Caregiver",
    requiredHours: 24,
    completedHours: 26,
    requiredInstructorLedHours: 5,
    completedInstructorLedHours: 6,
    annualDueDate: new Date("2026-11-15T12:00:00-06:00"),
    cprExpirationDate: new Date("2027-06-01T12:00:00-05:00"),
    firstAidExpirationDate: new Date("2027-06-01T12:00:00-05:00"),
  },
  {
    id: "emp-104",
    name: "Milly Jacobs",
    location: "Kilgore, Texas",
    role: "Director",
    requiredHours: 30,
    completedHours: 29,
    requiredInstructorLedHours: 8,
    completedInstructorLedHours: 7,
    annualDueDate: new Date("2026-10-06T12:00:00-05:00"),
    cprExpirationDate: new Date("2026-10-14T12:00:00-05:00"),
    firstAidExpirationDate: new Date("2026-10-14T12:00:00-05:00"),
  },
  {
    id: "emp-105",
    name: "Abigail Stroman",
    location: "Kilgore, Texas",
    role: "Caregiver",
    requiredHours: 24,
    completedHours: 18,
    requiredInstructorLedHours: 5,
    completedInstructorLedHours: 2,
    annualDueDate: new Date("2026-09-25T12:00:00-05:00"),
    firstAidExpirationDate: new Date("2027-03-19T12:00:00-05:00"),
  },
];

export const employeeRows = employees.map((employee) => ({
  ...employee,
  compliance: evaluateEmployeeCompliance({ ...employee, today }),
}));

export const dashboardMetrics = {
  employees: 42,
  compliant: 31,
  attention: 7,
  nonCompliant: 3,
  missingData: 1,
  trainingDueSoon: 6,
  cprExpiring: 4,
  cprExpired: 2,
  deficient: 8,
  pendingApprovals: 5,
};

export const activityItems = [
  {
    id: "activity-001",
    message: "Sarah Jones approved 12 bulk training records for Kilgore, Texas.",
  },
  {
    id: "activity-002",
    message: "CPR certificate for Jane Smith was marked expired by nightly recalculation.",
  },
  {
    id: "activity-003",
    message: "Abigail Stroman submitted external training for director review.",
  },
  {
    id: "activity-004",
    message: "Compliance Rule Set: Texas Child Care Requirements 2026 was versioned.",
  },
];
