import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional()
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const existing = await prisma.loanProduct.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.parse(await request.json());
  const product = await prisma.loanProduct.update({ where: { id }, data: parsed });
  await audit({ userId: user.id, action: "Loan product update", entityType: "LoanProduct", entityId: id, oldValue: existing, newValue: product });
  return NextResponse.json(product);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const existing = await prisma.loanProduct.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.loanProduct.delete({ where: { id } });
  await audit({ userId: user.id, action: "Loan product deletion", entityType: "LoanProduct", entityId: id, oldValue: existing });
  return NextResponse.json({ ok: true });
}
