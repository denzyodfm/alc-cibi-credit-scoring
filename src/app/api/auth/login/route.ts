import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const login = String(body?.login ?? "").trim();
  const password = String(body?.password ?? "");
  if (!login || !password) return NextResponse.json({ error: "Missing credentials" }, { status: 400 });

  // Always limit per account, which is the protection that matters against password guessing.
  // Limit per address only when a proxy actually told us the address — otherwise every request
  // shares one key and one person's failed attempts would lock out the whole office.
  const ip = clientIp(request);
  const userKey = `login:user:${login.toLowerCase()}`;
  const ipKey = ip ? `login:ip:${ip}` : null;
  for (const key of ipKey ? [ipKey, userKey] : [userKey]) {
    const limited = rateLimit(key, MAX_ATTEMPTS, WINDOW_MS);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
      );
    }
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: login }, { email: login }],
      status: "ACTIVE"
    }
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (ipKey) resetRateLimit(ipKey);
  resetRateLimit(userKey);
  await setSessionCookie(createSessionToken(user.id));
  return NextResponse.json({ ok: true });
}
