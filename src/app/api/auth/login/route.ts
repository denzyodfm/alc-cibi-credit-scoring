import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const login = String(body?.login ?? "").trim();
  const password = String(body?.password ?? "");
  if (!login || !password) return NextResponse.json({ error: "Missing credentials" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: login }, { email: login }],
      status: "ACTIVE"
    }
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await setSessionCookie(createSessionToken(user.id));
  return NextResponse.json({ ok: true });
}
