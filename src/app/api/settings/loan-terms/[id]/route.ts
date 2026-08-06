import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  months: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional()
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const existing = await prisma.loanTermOption.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.parse(await request.json());
  const term = await prisma.loanTermOption.update({ where: { id }, data: parsed });
  await audit({ userId: user.id, action: "Loan term update", entityType: "LoanTermOption", entityId: id, oldValue: existing, newValue: term });
  return NextResponse.json(term);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const existing = await prisma.loanTermOption.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.loanTermOption.delete({ where: { id } });
  await audit({ userId: user.id, action: "Loan term deletion", entityType: "LoanTermOption", entityId: id, oldValue: existing });
  return NextResponse.json({ ok: true });
}
