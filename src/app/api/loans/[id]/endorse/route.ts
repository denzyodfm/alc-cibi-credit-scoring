import { NextResponse } from "next/server";
import { z } from "zod";
import { canEndorseCredit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routeToCreditCommittee } from "@/lib/scorecard";

const schema = z.object({ remarks: z.string().max(5000).optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canEndorseCredit(user)) return NextResponse.json({ error: "Only an Account Assistant or administrator can endorse this application." }, { status: 403 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const loan = await prisma.loanApplication.findUnique({ where: { id }, include: { scorecard: true } });
  if (!loan || loan.status !== "FOR_ENDORSEMENT") return NextResponse.json({ error: "Loan is not awaiting endorsement." }, { status: 400 });
  if (!loan.scorecard || !["FOR_ENDORSEMENT", "PROCEED"].includes(loan.scorecard.result)) return NextResponse.json({ error: "Only a passing CI/BI result can be endorsed." }, { status: 409 });
  const body = schema.parse(await request.json().catch(() => ({})));
  const now = new Date();
  const code = `END-${now.getFullYear()}-${String(id).padStart(5, "0")}-${String(user.id).padStart(3, "0")}`;
  const committee = await routeToCreditCommittee(id, user.id);
  if (!committee) return NextResponse.json({ error: "Complete the required branch committee assignments in Settings before endorsement." }, { status: 409 });
  await prisma.loanApplication.update({ where: { id }, data: { status: "FOR_CREDIT_COMMITTEE", endorsedBy: user.id, endorsedAt: now, endorsementCode: code, endorsementRemarks: body.remarks } });
  await prisma.auditLog.create({ data: { userId: user.id, action: "Loan endorsed", entityType: "LoanApplication", entityId: String(id), newValue: { code, remarks: body.remarks } } });
  return NextResponse.json({ ok: true, code, committee: committee.committeeName });
}
