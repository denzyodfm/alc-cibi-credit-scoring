import { NextResponse } from "next/server";
import { badRequest } from "@/lib/http";
import { z } from "zod";
import { canReviewCredit, isCommitteeAdministrator, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { approvalStageLimit } from "@/lib/committee-config";

const schema = z.object({
  decision: z.enum(["PENDING", "APPROVED", "DENIED", "RETURNED_FOR_COMPLETION"]),
  // A return must say why — the Account Officer only sees this note when the loan lands back.
  remarks: z.string().optional(),
  recommendedAmount: z.coerce.number().nonnegative().optional(),
  recommendedTerms: z.coerce.number().int().positive().optional()
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canReviewCredit(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const __parsed = schema.safeParse(await request.json().catch(() => null));
  if (!__parsed.success) return badRequest(__parsed.error);
  const body = __parsed.data;
  const existing = await prisma.creditCommitteeReview.findUnique({ where: { id }, include: { loanApplication: true, creditCommittee: { include: { members: true } } } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const stageLimit = approvalStageLimit(Number(existing.loanApplication.amountApplied));
  if (existing.approvalSequence > stageLimit) return NextResponse.json({ error: "This approval stage is not required for the loan amount." }, { status: 409 });
  if (existing.reviewerId !== user.id && !isCommitteeAdministrator(user)) return NextResponse.json({ error: "This review is assigned to another approver." }, { status: 403 });
  if (!isCommitteeAdministrator(user) && ["BOOKKEEPER", "BRANCH_TEAM_LEADER"].includes(user.role) && existing.loanApplication.branchId !== user.branchId) return NextResponse.json({ error: "This loan belongs to another branch." }, { status: 403 });
  const currentPending = await prisma.creditCommitteeReview.findFirst({ where: { loanApplicationId: existing.loanApplicationId, creditCommitteeId: existing.creditCommitteeId, approvalSequence: { lte: stageLimit }, decision: "PENDING" }, orderBy: { approvalSequence: "asc" } });
  if (!isCommitteeAdministrator(user) && currentPending?.id !== existing.id) return NextResponse.json({ error: "This loan is currently assigned to an earlier approval stage." }, { status: 409 });
  if (body.decision === "APPROVED" && existing.approvalSequence > 1) {
    const incompleteEarlier = await prisma.creditCommitteeReview.count({ where: { loanApplicationId: existing.loanApplicationId, creditCommitteeId: existing.creditCommitteeId, approvalSequence: { lt: existing.approvalSequence }, decision: { not: "APPROVED" } } });
    if (incompleteEarlier) return NextResponse.json({ error: "Earlier approval levels must approve first." }, { status: 409 });
  }
  if (body.decision === "RETURNED_FOR_COMPLETION" && !body.remarks?.trim()) {
    return NextResponse.json({ error: "Give the Account Officer a reason before sending this back." }, { status: 400 });
  }

  const now = new Date();
  const approvalCode = body.decision === "PENDING" ? null : `APR-${now.getFullYear()}-${String(existing.loanApplicationId).padStart(5, "0")}-${String(existing.approvalSequence).padStart(2, "0")}-${String(existing.reviewerId).padStart(3, "0")}`;
  const review = await prisma.creditCommitteeReview.update({
    where: { id },
    data: { decision: body.decision, remarks: body.remarks, recommendedAmount: body.recommendedAmount, recommendedTerms: body.recommendedTerms, approvalCode, reviewedAt: body.decision === "PENDING" ? null : now }
  });

  if (body.decision === "APPROVED") {
    const pendingRequired = await prisma.creditCommitteeReview.count({ where: { loanApplicationId: existing.loanApplicationId, creditCommitteeId: existing.creditCommitteeId, approvalSequence: { lte: stageLimit }, id: { not: id }, decision: { not: "APPROVED" } } });
    if (pendingRequired === 0) await prisma.loanApplication.update({ where: { id: existing.loanApplicationId }, data: { status: "APPROVED" } });
  } else if (body.decision === "DENIED") {
    await prisma.loanApplication.update({ where: { id: existing.loanApplicationId }, data: { status: "DENIED" } });
  } else if (body.decision === "RETURNED_FOR_COMPLETION") {
    // Sending a loan back hands it to the Account Officer for correction and clears the chain, so
    // nobody's earlier approval carries over onto figures they never saw. Re-endorsement starts
    // the committee sequence again from the Bookkeeper.
    await prisma.$transaction([
      prisma.creditCommitteeReview.deleteMany({ where: { loanApplicationId: existing.loanApplicationId } }),
      prisma.loanApplication.update({
        where: { id: existing.loanApplicationId },
        data: {
          status: "CI_BI_IN_PROGRESS",
          endorsedBy: null,
          endorsedAt: null,
          endorsementCode: null,
          endorsementRemarks: null,
          returnedBy: user.id,
          returnedAt: now,
          returnedFromRole: existing.committeeRole,
          returnedRemarks: body.remarks ?? null
        }
      })
    ]);
  }

  await audit({ userId: user.id, action: "Credit Committee decision", entityType: "CreditCommitteeReview", entityId: id, oldValue: existing, newValue: review });
  return NextResponse.json(review);
}
