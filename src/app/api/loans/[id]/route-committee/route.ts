import { NextResponse } from "next/server";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routeToCreditCommittee } from "@/lib/scorecard";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const loan = await prisma.loanApplication.findUnique({ where: { id } });
  if (!loan || !canAccessBranch(user, loan.branchId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (loan.status !== "ENDORSED") return NextResponse.json({ error: "Loan must be endorsed first." }, { status: 400 });
  const committee = await routeToCreditCommittee(id, user.id);
  if (!committee) return NextResponse.json({ error: "No active committee is configured for this loan amount." }, { status: 400 });
  await prisma.loanApplication.update({ where: { id }, data: { status: "FOR_CREDIT_COMMITTEE" } });
  return NextResponse.json({ ok: true, committee: committee.committeeName });
}
