import { describe, expect, it } from "vitest";
import { evaluateEmployeeCompliance, getCertificationState } from "@/lib/compliance";

const today = new Date("2026-08-25T12:00:00-05:00");

describe("evaluateEmployeeCompliance", () => {
  it("marks exact completed hours as compliant", () => {
    const result = evaluateEmployeeCompliance({
      requiredHours: 24,
      completedHours: 24,
      requiredInstructorLedHours: 5,
      completedInstructorLedHours: 5,
      annualDueDate: new Date("2026-12-31T12:00:00-06:00"),
      cprExpirationDate: new Date("2027-01-31T12:00:00-06:00"),
      firstAidExpirationDate: new Date("2027-01-31T12:00:00-06:00"),
      today,
    });

    expect(result.status).toBe("COMPLIANT");
    expect(result.annualTraining.remaining).toBe(0);
  });

  it("keeps excess hours separate from remaining hours", () => {
    const result = evaluateEmployeeCompliance({
      requiredHours: 24,
      completedHours: 26,
      requiredInstructorLedHours: 5,
      completedInstructorLedHours: 6,
      annualDueDate: new Date("2026-12-31T12:00:00-06:00"),
      cprExpirationDate: new Date("2027-01-31T12:00:00-06:00"),
      firstAidExpirationDate: new Date("2027-01-31T12:00:00-06:00"),
      today,
    });

    expect(result.annualTraining.remaining).toBe(0);
    expect(result.annualTraining.excess).toBe(2);
    expect(result.instructorLed.excess).toBe(1);
  });

  it("flags deficient annual training", () => {
    const result = evaluateEmployeeCompliance({
      requiredHours: 24,
      completedHours: 20,
      requiredInstructorLedHours: 5,
      completedInstructorLedHours: 5,
      annualDueDate: new Date("2026-12-31T12:00:00-06:00"),
      cprExpirationDate: new Date("2027-01-31T12:00:00-06:00"),
      firstAidExpirationDate: new Date("2027-01-31T12:00:00-06:00"),
      today,
    });

    expect(result.status).toBe("ATTENTION");
    expect(result.annualTraining.remaining).toBe(4);
  });

  it("flags deficient instructor-led training", () => {
    const result = evaluateEmployeeCompliance({
      requiredHours: 24,
      completedHours: 24,
      requiredInstructorLedHours: 5,
      completedInstructorLedHours: 4,
      annualDueDate: new Date("2026-12-31T12:00:00-06:00"),
      cprExpirationDate: new Date("2027-01-31T12:00:00-06:00"),
      firstAidExpirationDate: new Date("2027-01-31T12:00:00-06:00"),
      today,
    });

    expect(result.status).toBe("ATTENTION");
    expect(result.instructorLed.remaining).toBe(1);
  });

  it("warns when CPR expires tomorrow", () => {
    expect(getCertificationState(new Date("2026-08-26T12:00:00-05:00"), today)).toBe(
      "EXPIRING",
    );
  });

  it("marks expired CPR as non-compliant", () => {
    const result = evaluateEmployeeCompliance({
      requiredHours: 24,
      completedHours: 24,
      requiredInstructorLedHours: 5,
      completedInstructorLedHours: 5,
      annualDueDate: new Date("2026-12-31T12:00:00-06:00"),
      cprExpirationDate: new Date("2026-08-24T12:00:00-05:00"),
      firstAidExpirationDate: new Date("2027-01-31T12:00:00-06:00"),
      today,
    });

    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("does not falsely pass employees with missing CPR data", () => {
    const result = evaluateEmployeeCompliance({
      requiredHours: 24,
      completedHours: 24,
      requiredInstructorLedHours: 5,
      completedInstructorLedHours: 5,
      annualDueDate: new Date("2026-12-31T12:00:00-06:00"),
      firstAidExpirationDate: new Date("2027-01-31T12:00:00-06:00"),
      today,
    });

    expect(result.status).toBe("UNKNOWN");
  });

  it("excludes terminated employees from active compliance monitoring", () => {
    const result = evaluateEmployeeCompliance({
      requiredHours: 24,
      completedHours: 0,
      requiredInstructorLedHours: 5,
      completedInstructorLedHours: 0,
      employmentStatus: "TERMINATED",
      today,
    });

    expect(result.status).toBe("UNKNOWN");
    expect(result.reasons[0]).toContain("excluded");
  });
});
