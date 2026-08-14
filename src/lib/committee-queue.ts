import { prisma } from "@/lib/prisma";
import { COMMITTEE_STAGE_ORDER, approvalStageLimit, committeeRoleLabel, stagesForAmount } from "@/lib/committee-config";

/**
 * Everything the committee screens need about where a loan currently sits.
 *
 * A loan's position is not stored on the row — it is the first review still PENDING within the
 * stage limit for its amount. Deriving it keeps the queue honest if the tiers are ever retuned.
 */
export type QueueEntry = {
  id: number;
  applicationNo: string;
  applicantName: string;
  branchCode: string;
  branchName: string;
  loanOfficer: string;
  amountApplied: number;
  status: string;
  endorsedAt: Date | null;
  endorsementCode: string | null;
  /** Committee role key the loan is waiting on, or null once every required stage has approved. */
  currentStageKey: string | null;
  currentStageLabel: string | null;
  currentReviewId: number | null;
  stageNumber: number;
  stageCount: number;
  stages: {
    roleKey: string;
    label: string;
    sequence: number;
    decision: string;
    reviewer: string;
    approvalCode: string | null;
    reviewedAt: Date | null;
    remarks: string | null;
  }[];
};

/** Reviews store the human label, so map it back to the stage key the URLs and menus use. */
const LABEL_TO_KEY = new Map(COMMITTEE_STAGE_ORDER.map((key) => [committeeRoleLabel(key), key as string]));

function roleKeyFromLabel(label: string | null | undefined, amount: number, sequence: number) {
  const mapped = label ? LABEL_TO_KEY.get(label) : undefined;
  if (mapped) return mapped;
  // Fall back to position in the chain when a stored label predates a rename.
  return stagesForAmount(amount)[sequence - 1] ?? null;
}

type LoanWithReviews = Awaited<ReturnType<typeof loadLoans>>[number];

async function loadLoans(where: Record<string, unknown>) {
  return prisma.loanApplication.findMany({
    where,
    include: {
      branch: { select: { branchCode: true, branchName: true } },
      loanOfficer: { select: { fullName: true } },
      applicantProfile: { select: { fullName: true } },
      committeeReviews: {
        include: { reviewer: { select: { fullName: true } } },
        orderBy: [{ approvalSequence: "asc" }, { createdAt: "asc" }]
      }
    },
    orderBy: { endorsedAt: "asc" },
    take: 200
  });
}

function toEntry(loan: LoanWithReviews): QueueEntry {
  const amount = Number(loan.amountApplied);
  const stageLimit = approvalStageLimit(amount);
  const required = loan.committeeReviews.filter((review) => review.approvalSequence <= stageLimit);
  const pending = required.find((review) => review.decision === "PENDING");

  return {
    id: loan.id,
    applicationNo: loan.applicationNo,
    applicantName: loan.applicantProfile?.fullName ?? "Incomplete profile",
    branchCode: loan.branch.branchCode,
    branchName: loan.branch.branchName,
    loanOfficer: loan.loanOfficer.fullName,
    amountApplied: amount,
    status: loan.status,
    endorsedAt: loan.endorsedAt,
    endorsementCode: loan.endorsementCode,
    currentStageKey: pending ? roleKeyFromLabel(pending.committeeRole, amount, pending.approvalSequence) : null,
    currentStageLabel: pending?.committeeRole ?? null,
    currentReviewId: pending?.id ?? null,
    stageNumber: pending?.approvalSequence ?? stageLimit,
    stageCount: stageLimit,
    stages: required.map((review) => ({
      roleKey: roleKeyFromLabel(review.committeeRole, amount, review.approvalSequence) ?? "",
      label: review.committeeRole ?? `Stage ${review.approvalSequence}`,
      sequence: review.approvalSequence,
      decision: review.decision,
      reviewer: review.reviewer.fullName,
      approvalCode: review.approvalCode,
      reviewedAt: review.reviewedAt,
      remarks: review.remarks
    }))
  };
}

/** Endorsed loans that have not finished the chain — the overview board. */
export async function pendingQueue(branchId?: number) {
  const loans = await loadLoans({
    status: { in: ["ENDORSED", "FOR_CREDIT_COMMITTEE"] },
    ...(branchId ? { branchId } : {})
  });
  return loans.map(toEntry);
}

/** Loans waiting on one specific committee right now. */
export async function stageQueue(roleKey: string, branchId?: number) {
  const entries = await pendingQueue(branchId);
  return entries.filter((entry) => entry.currentStageKey === roleKey);
}

export async function approvedQueue(branchId?: number) {
  const loans = await loadLoans({ status: "APPROVED", ...(branchId ? { branchId } : {}) });
  return loans.map(toEntry);
}
