export type ComplianceStatus =
  | "COMPLIANT"
  | "ATTENTION"
  | "AT_RISK"
  | "OVERDUE"
  | "NON_COMPLIANT"
  | "UNKNOWN";

export type CertificationState = "VALID" | "EXPIRING" | "EXPIRED" | "MISSING";

export type EmployeeComplianceInput = {
  requiredHours: number;
  completedHours: number;
  requiredInstructorLedHours: number;
  completedInstructorLedHours: number;
  annualDueDate?: Date;
  cprExpirationDate?: Date;
  firstAidExpirationDate?: Date;
  today?: Date;
  employmentStatus?: "ACTIVE" | "LEAVE" | "TERMINATED" | "FUTURE_HIRE";
};

export type EmployeeComplianceResult = {
  status: ComplianceStatus;
  annualTraining: {
    required: number;
    completed: number;
    remaining: number;
    excess: number;
  };
  instructorLed: {
    required: number;
    completed: number;
    remaining: number;
    excess: number;
  };
  certifications: {
    cpr: CertificationState;
    firstAid: CertificationState;
  };
  daysUntilDeadline: number | null;
  reasons: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function daysBetween(start: Date, end: Date) {
  return Math.ceil((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS);
}

export function getCertificationState(
  expirationDate: Date | undefined,
  today = new Date(),
): CertificationState {
  if (!expirationDate) {
    return "MISSING";
  }

  const daysRemaining = daysBetween(today, expirationDate);

  if (daysRemaining < 0) {
    return "EXPIRED";
  }

  if (daysRemaining <= 60) {
    return "EXPIRING";
  }

  return "VALID";
}

export function evaluateEmployeeCompliance(
  input: EmployeeComplianceInput,
): EmployeeComplianceResult {
  const today = input.today ?? new Date();
  const employmentStatus = input.employmentStatus ?? "ACTIVE";
  const trainingRemaining = Math.max(0, input.requiredHours - input.completedHours);
  const trainingExcess = Math.max(0, input.completedHours - input.requiredHours);
  const instructorRemaining = Math.max(
    0,
    input.requiredInstructorLedHours - input.completedInstructorLedHours,
  );
  const instructorExcess = Math.max(
    0,
    input.completedInstructorLedHours - input.requiredInstructorLedHours,
  );
  const cpr = getCertificationState(input.cprExpirationDate, today);
  const firstAid = getCertificationState(input.firstAidExpirationDate, today);
  const daysUntilDeadline = input.annualDueDate
    ? daysBetween(today, input.annualDueDate)
    : null;
  const reasons: string[] = [];

  if (employmentStatus === "TERMINATED" || employmentStatus === "FUTURE_HIRE") {
    return {
      status: "UNKNOWN",
      annualTraining: {
        required: input.requiredHours,
        completed: input.completedHours,
        remaining: trainingRemaining,
        excess: trainingExcess,
      },
      instructorLed: {
        required: input.requiredInstructorLedHours,
        completed: input.completedInstructorLedHours,
        remaining: instructorRemaining,
        excess: instructorExcess,
      },
      certifications: { cpr, firstAid },
      daysUntilDeadline,
      reasons: ["Employee is excluded from active compliance monitoring."],
    };
  }

  if (!input.annualDueDate) {
    reasons.push("Annual training deadline is missing.");
  }

  if (cpr === "MISSING") {
    reasons.push("CPR certification information is missing.");
  }

  if (firstAid === "MISSING") {
    reasons.push("First Aid certification information is missing.");
  }

  if (trainingRemaining > 0) {
    reasons.push(`${trainingRemaining} annual training hour(s) remaining.`);
  }

  if (instructorRemaining > 0) {
    reasons.push(`${instructorRemaining} instructor-led hour(s) remaining.`);
  }

  if (cpr === "EXPIRED") {
    reasons.push("CPR certification is expired.");
  }

  if (firstAid === "EXPIRED") {
    reasons.push("First Aid certification is expired.");
  }

  if (daysUntilDeadline !== null && daysUntilDeadline < 0) {
    reasons.push("Annual training deadline has passed.");
  }

  let status: ComplianceStatus = "COMPLIANT";

  if (reasons.some((reason) => reason.includes("missing"))) {
    status = "UNKNOWN";
  } else if (
    cpr === "EXPIRED" ||
    firstAid === "EXPIRED" ||
    (daysUntilDeadline !== null && daysUntilDeadline < 0)
  ) {
    status = "NON_COMPLIANT";
  } else if (
    (daysUntilDeadline !== null && daysUntilDeadline <= 30 && trainingRemaining > 0) ||
    cpr === "EXPIRING" ||
    firstAid === "EXPIRING"
  ) {
    status = "AT_RISK";
  } else if (
    trainingRemaining > 0 ||
    instructorRemaining > 0 ||
    (daysUntilDeadline !== null && daysUntilDeadline <= 60)
  ) {
    status = "ATTENTION";
  }

  return {
    status,
    annualTraining: {
      required: input.requiredHours,
      completed: input.completedHours,
      remaining: trainingRemaining,
      excess: trainingExcess,
    },
    instructorLed: {
      required: input.requiredInstructorLedHours,
      completed: input.completedInstructorLedHours,
      remaining: instructorRemaining,
      excess: instructorExcess,
    },
    certifications: { cpr, firstAid },
    daysUntilDeadline,
    reasons: reasons.length ? reasons : ["All configured requirements are satisfied."],
  };
}
