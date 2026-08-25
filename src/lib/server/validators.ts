import { z } from "zod";

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? new Date(`${value}T12:00:00`) : undefined));

export const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  jobRoleId: z.string().trim().min(1),
  annualTrainingDueDate: optionalDate,
  hireDate: optionalDate,
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  employmentStatus: z.enum(["ACTIVE", "LEAVE", "TERMINATED", "FUTURE_HIRE"]).optional(),
});

export const createTrainingRecordSchema = z.object({
  employeeId: z.string().trim().min(1),
  courseName: z.string().trim().min(1),
  provider: z.string().trim().optional(),
  trainingDate: optionalDate,
  hours: z.coerce.number().positive(),
  trainingDeliveryType: z
    .enum(["ONLINE", "INSTRUCTOR_LED", "SELF_STUDY", "IN_PERSON", "OTHER"])
    .default("ONLINE"),
  competencyCategory: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const upsertCertificationSchema = z.object({
  employeeId: z.string().trim().min(1),
  certificationType: z.enum(["CPR", "FIRST_AID", "FOOD_HANDLER", "DIRECTOR_CREDENTIAL", "CDA", "OTHER"]),
  provider: z.string().trim().optional(),
  certificateNumber: z.string().trim().optional(),
  issueDate: optionalDate,
  expirationDate: optionalDate,
});

export const updateRequirementSchema = z.object({
  jobRoleId: z.string().trim().min(1),
  requiredHours: z.coerce.number().positive(),
  minimumInstructorLedHours: z.coerce.number().min(0),
});
