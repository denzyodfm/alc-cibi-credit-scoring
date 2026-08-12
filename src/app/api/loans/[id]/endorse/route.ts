import { NextResponse } from "next/server";
import { z } from "zod";
import { canReviewCredit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ remarks: z.string().max(5000).optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canReviewCredit(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const loan = await prisma.loanApplication.findUnique({ where: { id } });
  if (!loan || loan.status !== "FOR_ENDORSEMENT") return NextResponse.json({ error: "Loan is not awaiting endorsement." }, { status: 400 });
  const body = schema.parse(await request.json().catch(() => ({})));
  const now = new Date();
  const code = `END-${now.getFullYear()}-${String(id).padStart(5, "0")}-${String(user.id).padStart(3, "0")}`;
  await prisma.loanApplication.update({ where: { id }, data: { status: "ENDORSED", endorsedBy: user.id, endorsedAt: now, endorsementCode: code, endorsementRemarks: body.remarks } });
  await prisma.auditLog.create({ data: { userId: user.id, action: "Loan endorsed", entityType: "LoanApplication", entityId: String(id), newValue: { code, remarks: body.remarks } } });
  return NextResponse.json({ ok: true, code });
}
