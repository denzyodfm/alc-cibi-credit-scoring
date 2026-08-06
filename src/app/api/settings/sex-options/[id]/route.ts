import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  label: z.string().min(1).optional(),
  isActive: z.boolean().optional()
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const existing = await prisma.sexOption.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.parse(await request.json());
  const option = await prisma.sexOption.update({ where: { id }, data: parsed });
  await audit({ userId: user.id, action: "Sex option update", entityType: "SexOption", entityId: id, oldValue: existing, newValue: option });
  return NextResponse.json(option);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const existing = await prisma.sexOption.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.sexOption.delete({ where: { id } });
  await audit({ userId: user.id, action: "Sex option deletion", entityType: "SexOption", entityId: id, oldValue: existing });
  return NextResponse.json({ ok: true });
}
