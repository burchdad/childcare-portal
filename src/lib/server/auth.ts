import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORGANIZATION_ID, SESSION_COOKIE } from "@/lib/server/constants";

export type AppRole =
  | "PLATFORM_ADMIN"
  | "ORG_OWNER"
  | "CORPORATE_ADMIN"
  | "LOCATION_DIRECTOR"
  | "ASSISTANT_DIRECTOR"
  | "COMPLIANCE_MANAGER"
  | "EMPLOYEE"
  | "AUDITOR";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  employeeId?: string | null;
  roles: AppRole[];
};

const roleRank: Record<AppRole, number> = {
  PLATFORM_ADMIN: 100,
  ORG_OWNER: 90,
  CORPORATE_ADMIN: 80,
  LOCATION_DIRECTOR: 70,
  ASSISTANT_DIRECTOR: 60,
  COMPLIANCE_MANAGER: 60,
  AUDITOR: 50,
  EMPLOYEE: 10,
};

function sessionSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "local-dev-secret";
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function verifySignature(value: string, signature: string) {
  const expected = sign(value);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function createSessionToken(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({ userId, issuedAt: Date.now() }),
    "utf8",
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token?: string) {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !verifySignature(payload, signature)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId?: string;
    };

    return data.userId ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const cookieStore = await cookies();
  const userId = readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  if (!userId) {
    return null;
  }

  const user = await prisma.userProfile.findUnique({
    where: { id: userId },
    include: { roles: true },
  });

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    organizationId: user.organizationId,
    employeeId: user.employeeId,
    roles: user.roles.map((role) => role.role as AppRole),
  };
}

export function canAccessRole(user: SessionUser, allowedRoles: AppRole[]) {
  return user.roles.some((role) => allowedRoles.includes(role));
}

export function canManageEmployees(user: SessionUser) {
  return canAccessRole(user, [
    "PLATFORM_ADMIN",
    "ORG_OWNER",
    "CORPORATE_ADMIN",
    "LOCATION_DIRECTOR",
    "ASSISTANT_DIRECTOR",
    "COMPLIANCE_MANAGER",
  ]);
}

export function canManageRules(user: SessionUser) {
  return canAccessRole(user, [
    "PLATFORM_ADMIN",
    "ORG_OWNER",
    "CORPORATE_ADMIN",
    "COMPLIANCE_MANAGER",
  ]);
}

export function primaryRole(user: SessionUser) {
  return [...user.roles].sort((a, b) => roleRank[b] - roleRank[a])[0] ?? "EMPLOYEE";
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: Response.json({ error: "Sign in required." }, { status: 401 }) };
  }

  return { user };
}

export async function requireRole(allowedRoles: AppRole[]) {
  const session = await requireUser();
  if ("error" in session) {
    return session;
  }

  if (!canAccessRole(session.user, allowedRoles)) {
    return { error: Response.json({ error: "Permission denied." }, { status: 403 }) };
  }

  return session;
}

export function organizationScope(user: SessionUser | null) {
  return user?.organizationId ?? DEFAULT_ORGANIZATION_ID;
}
