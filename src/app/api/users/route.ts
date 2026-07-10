import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  employeeNo: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
  branchId: z.coerce.number(),
  role: z.enum([
    "SUPER_ADMIN",
    "HEAD_OFFICE_ADMIN",
    "HEAD_OFFICE_CREDIT_COMMITTEE",
    "AREA_TEAM_LEADER",
    "BRANCH_TEAM_LEADER",
    "ACCOUNT_OFFICER",
    "CASHIER",
    "BOOKKEEPER",
    "VIEWER"
  ])
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.parse(await request.json());
  const created = await prisma.user.create({
    data: {
      employeeNo: parsed.employeeNo,
      fullName: parsed.fullName,
      email: parsed.email,
      username: parsed.username,
      passwordHash: await bcrypt.hash(parsed.password, 12),
      branchId: parsed.branchId,
      role: parsed.role
    }
  });
  await audit({ userId: user.id, action: "User creation/update", entityType: "User", entityId: created.id, newValue: { ...created, passwordHash: "[redacted]" } });
  return NextResponse.json({ id: created.id });
}
