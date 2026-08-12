import { NextResponse } from "next/server";
import { z } from "zod";
import { canReviewCredit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  decision: z.enum(["PENDING", "APPROVED", "DENIED", "RETURNED_FOR_COMPLETION"]),
  remarks: z.string().optional(),
  recommendedAmount: z.coerce.number().nonnegative().optional(),
  recommendedTerms: z.coerce.number().int().positive().optional()
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canReviewCredit(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const body = schema.parse(await request.json());
  const existing = await prisma.creditCommitteeReview.findUnique({ where: { id }, include: { loanApplication: true, creditCommittee: { include: { members: true } } } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.reviewerId !== user.id && user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "This review is assigned to another approver." }, { status: 403 });
  if (body.decision === "APPROVED" && existing.approvalSequence > 1) {
    const incompleteEarlier = await prisma.creditCommitteeReview.count({ where: { loanApplicationId: existing.loanApplicationId, creditCommitteeId: existing.creditCommitteeId, approvalSequence: { lt: existing.approvalSequence }, decision: { not: "APPROVED" } } });
    if (incompleteEarlier) return NextResponse.json({ error: "Earlier approval levels must approve first." }, { status: 409 });
  }
  const now = new Date();
  const approvalCode = body.decision === "PENDING" ? null : `APR-${now.getFullYear()}-${String(existing.loanApplicationId).padStart(5, "0")}-${String(existing.approvalSequence).padStart(2, "0")}-${String(existing.reviewerId).padStart(3, "0")}`;
  const review = await prisma.creditCommitteeReview.update({
    where: { id },
    data: { decision: body.decision, remarks: body.remarks, recommendedAmount: body.recommendedAmount, recommendedTerms: body.recommendedTerms, approvalCode, reviewedAt: body.decision === "PENDING" ? null : now }
  });

  if (body.decision === "APPROVED") {
    const pendingRequired = await prisma.creditCommitteeReview.count({ where: { loanApplicationId: existing.loanApplicationId, creditCommitteeId: existing.creditCommitteeId, id: { not: id }, decision: { not: "APPROVED" } } });
    if (pendingRequired === 0) await prisma.loanApplication.update({ where: { id: existing.loanApplicationId }, data: { status: "APPROVED" } });
  } else if (body.decision === "DENIED") {
    await prisma.loanApplication.update({ where: { id: existing.loanApplicationId }, data: { status: "DENIED" } });
  } else if (body.decision === "RETURNED_FOR_COMPLETION") {
    await prisma.loanApplication.update({ where: { id: existing.loanApplicationId }, data: { status: "ENDORSED" } });
  }

  await audit({ userId: user.id, action: "Credit Committee decision", entityType: "CreditCommitteeReview", entityId: id, oldValue: existing, newValue: review });
  return NextResponse.json(review);
}
