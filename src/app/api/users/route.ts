import { NextResponse } from "next/server";
import { badRequest } from "@/lib/http";
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
  positionId: z.coerce.number().int().positive()
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const __parsed = schema.safeParse(await request.json().catch(() => null));
  if (!__parsed.success) return badRequest(__parsed.error);
  const parsed = __parsed.data;
  const position = await prisma.position.findFirstOrThrow({ where: { id: parsed.positionId, isActive: true } });
  const created = await prisma.user.create({
    data: {
      employeeNo: parsed.employeeNo,
      fullName: parsed.fullName,
      email: parsed.email,
      username: parsed.username,
      passwordHash: await bcrypt.hash(parsed.password, 12),
      branchId: parsed.branchId,
      positionId: position.id,
      role: position.systemRole
    }
  });
  await audit({ userId: user.id, action: "User creation/update", entityType: "User", entityId: created.id, newValue: { ...created, passwordHash: "[redacted]" } });
  return NextResponse.json({ id: created.id });
}
