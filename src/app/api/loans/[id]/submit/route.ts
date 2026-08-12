import { NextResponse } from "next/server";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await context.params;
  const loanApplicationId = Number(rawId);
  const loan = await prisma.loanApplication.findUnique({ where: { id: loanApplicationId } });
  if (!loan || !canAccessBranch(user, loan.branchId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (loan.status === "FOR_ENDORSEMENT") return NextResponse.json({ ok: true });
  if (loan.status !== "PROCEED") {
    return NextResponse.json({ error: "The loan must pass CI/BI scoring before endorsement." }, { status: 400 });
  }
  await prisma.loanApplication.update({ where: { id: loanApplicationId }, data: { status: "FOR_ENDORSEMENT" } });
  await prisma.auditLog.create({ data: { userId: user.id, action: "Submit for endorsement", entityType: "LoanApplication", entityId: String(loanApplicationId) } });
  return NextResponse.json({ ok: true });
}
