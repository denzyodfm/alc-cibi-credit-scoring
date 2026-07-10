import { NextResponse } from "next/server";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routeToCreditCommittee } from "@/lib/scorecard";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await context.params;
  const loanApplicationId = Number(rawId);
  const loan = await prisma.loanApplication.findUnique({ where: { id: loanApplicationId } });
  if (!loan || !canAccessBranch(user, loan.branchId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const committee = await routeToCreditCommittee(loanApplicationId, user.id);
  if (committee && loan.status === "PROCEED") {
    await prisma.loanApplication.update({ where: { id: loanApplicationId }, data: { status: "FOR_CREDIT_COMMITTEE" } });
  }
  return NextResponse.json({ committee });
}
