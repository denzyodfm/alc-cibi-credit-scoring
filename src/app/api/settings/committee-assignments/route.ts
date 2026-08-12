import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { COMMITTEE_ROLES } from "@/lib/committee-config";
import { prisma } from "@/lib/prisma";

const roleKeys = COMMITTEE_ROLES.map(([key]) => key);
const schema = z.object({ branchId: z.coerce.number().int().positive(), roleKey: z.string().refine((value) => roleKeys.includes(value as never)), userId: z.coerce.number().int().positive() });

export async function PUT(request: Request) {
  const actor = await requireUser();
  if (!canManageSetup(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid committee assignment." }, { status: 400 });
  const [branch, user] = await Promise.all([prisma.branch.findUnique({ where: { id: parsed.data.branchId } }), prisma.user.findFirst({ where: { id: parsed.data.userId, status: "ACTIVE" } })]);
  if (!branch || !user) return NextResponse.json({ error: "Branch or active user not found." }, { status: 404 });
  const assignment = await prisma.branchCommitteeAssignment.upsert({ where: { branchId_roleKey: { branchId: branch.id, roleKey: parsed.data.roleKey } }, update: { userId: user.id }, create: parsed.data });
  await prisma.auditLog.create({ data: { userId: actor.id, action: `Set ${parsed.data.roleKey} to user ${user.id}`, entityType: "BranchCommitteeAssignment", entityId: String(assignment.id) } });
  return NextResponse.json({ ok: true });
}
