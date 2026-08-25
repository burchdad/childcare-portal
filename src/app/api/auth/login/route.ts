import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/server/auth";
import { SESSION_COOKIE } from "@/lib/server/constants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is required." }, { status: 503 });
  }

  const body = (await request.json()) as { email?: string; accessCode?: string };
  const configuredCode = process.env.PORTAL_ACCESS_CODE || "demo";

  if (!body.accessCode || body.accessCode !== configuredCode) {
    return NextResponse.json({ error: "Invalid access code." }, { status: 401 });
  }

  const user = await prisma.userProfile.findUnique({
    where: { email: String(body.email ?? "").trim().toLowerCase() },
  });

  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Active user not found." }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}
