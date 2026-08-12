import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessBranch, canReviewCredit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const numberValue = z.union([z.number(), z.string()]).optional().nullable();
const schema = z.object({
  computation: z.record(z.string(), numberValue).optional(),
  remarks: z.array(z.object({ sectionKey: z.string().min(1).max(50), aoRemarks: z.string().optional(), committeeRemarks: z.string().optional() })).optional()
});

const numericFields = ["outstandingBalance", "recommendedAmount", "interestRate", "serviceFee", "insurance", "documentaryStamp", "notarialFee", "otherCharges", "netProceeds", "monthlyAmortization"];

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const loan = await prisma.loanApplication.findUnique({ where: { id } });
  if (!loan || !canAccessBranch(user, loan.branchId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["ENDORSED", "FOR_CREDIT_COMMITTEE", "APPROVED", "DENIED"].includes(loan.status)) return NextResponse.json({ error: "Post-endorsement processing is locked." }, { status: 400 });
  const body = schema.parse(await request.json());

  if (body.computation) {
    const data: Record<string, unknown> = { ...body.computation };
    for (const key of numericFields) data[key] = data[key] === "" || data[key] == null ? null : Number(data[key]);
    await prisma.loanComputation.upsert({ where: { loanApplicationId: id }, update: data, create: { ...data, loanApplicationId: id } as any });
  }
  for (const remark of body.remarks ?? []) {
    const data = canReviewCredit(user) && user.role !== "ACCOUNT_OFFICER"
      ? { committeeRemarks: remark.committeeRemarks }
      : { aoRemarks: remark.aoRemarks };
    await prisma.loanSectionRemark.upsert({ where: { loanApplicationId_sectionKey: { loanApplicationId: id, sectionKey: remark.sectionKey } }, update: data, create: { loanApplicationId: id, sectionKey: remark.sectionKey, ...data } });
  }
  return NextResponse.json({ ok: true });
}
