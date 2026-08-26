import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageRules, organizationScope, requireRole, requireUser } from "@/lib/server/auth";
import { updateRequirementSchema } from "@/lib/server/validators";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireUser();
  if ("error" in session) {
    return session.error;
  }

  const ruleSets = await prisma.complianceRuleSet.findMany({
    where: { organizationId: organizationScope(session.user), active: true },
    include: {
      requirements: {
        include: { jobRole: true },
        orderBy: [{ jobRole: { name: "asc" } }, { requirementType: "asc" }],
      },
    },
  });

  return NextResponse.json({ ruleSets, canEdit: canManageRules(session.user) });
}

export async function PATCH(request: Request) {
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

  const parsed = updateRequirementSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const organizationId = organizationScope(session.user);
  const ruleSet = await prisma.complianceRuleSet.findFirst({
    where: { organizationId, active: true },
  });

  if (!ruleSet) {
    return NextResponse.json({ error: "No active rule set exists." }, { status: 404 });
  }

  const existing = await prisma.complianceRequirement.findFirst({
    where: {
      ruleSetId: ruleSet.id,
      jobRoleId: parsed.data.jobRoleId,
      requirementType: "ANNUAL_TRAINING",
    },
  });
  const requirement = existing
    ? await prisma.complianceRequirement.update({
        where: { id: existing.id },
        data: {
          requiredHours: parsed.data.requiredHours,
          minimumInstructorLedHours: parsed.data.minimumInstructorLedHours,
        },
      })
    : await prisma.complianceRequirement.create({
        data: {
          ruleSetId: ruleSet.id,
          jobRoleId: parsed.data.jobRoleId,
          requirementType: "ANNUAL_TRAINING",
          requiredHours: parsed.data.requiredHours,
          minimumInstructorLedHours: parsed.data.minimumInstructorLedHours,
          required: true,
        },
      });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: session.user.id,
      action: "COMPLIANCE_REQUIREMENT_UPDATED",
      entityType: "ComplianceRequirement",
      entityId: requirement.id,
      newValues: requirement,
    },
  });

  return NextResponse.json({ requirement });
}
