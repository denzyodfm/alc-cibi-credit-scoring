import { AppShell } from "@/components/AppShell";
import { ApprovalDashboard } from "@/components/ApprovalDashboard";
import { PageHeader } from "@/components/PageHeader";
import { canManageSetup, canReviewCredit, isCommitteeAdministrator, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approvalStageLimit } from "@/lib/committee-config";

export default async function CommitteePage() {
  const user = await requireUser();
  const allowed = canReviewCredit(user);
  const admin = isCommitteeAdministrator(user);
  const branchRestricted = user.role === "BOOKKEEPER" || user.role === "BRANCH_TEAM_LEADER";
  const candidates = allowed ? await prisma.loanApplication.findMany({
    where: admin ? { status: { in: ["FOR_CREDIT_COMMITTEE", "APPROVED", "DENIED"] } } : { status: "FOR_CREDIT_COMMITTEE", ...(branchRestricted ? { branchId: user.branchId } : {}), committeeReviews: { some: { reviewerId: user.id, decision: "PENDING" } } },
    include: { applicantProfile: { select: { fullName: true, photoDataUrl: true } }, branch: true, loanOfficer: true, scorecard: true, committeeReviews: { include: { reviewer: true, creditCommittee: true }, orderBy: [{ approvalSequence: "asc" }, { createdAt: "asc" }] } },
    orderBy: { updatedAt: "desc" },
    take: 100
  }) : [];
  const tieredCandidates = candidates.map((loan) => {
    const committeeReviews = loan.committeeReviews.filter((review) => review.approvalSequence <= approvalStageLimit(Number(loan.amountApplied)));
    return { ...loan, committeeReviews, currentCommitteeStage: committeeReviews.find((review) => review.decision === "PENDING")?.committeeRole || (loan.status === "APPROVED" ? "Approved" : loan.status.replaceAll("_", " ")) };
  });
  const loans = admin ? tieredCandidates : tieredCandidates.filter((loan) => {
    const current = loan.committeeReviews.find((review) => review.decision === "PENDING");
    return current?.reviewerId === user.id;
  });
  const approvers = admin
    ? await prisma.user.findMany({ where: { status: "ACTIVE", role: { in: ["SUPER_ADMIN", "HEAD_OFFICE_ADMIN", "HEAD_OFFICE_CREDIT_COMMITTEE", "BOOKKEEPER", "BRANCH_TEAM_LEADER", "AREA_TEAM_LEADER"] } }, select: { id: true, fullName: true, role: true }, orderBy: { id: "asc" } })
    : Array.from(new Map(loans.flatMap((loan) => loan.committeeReviews.map((review) => [review.reviewer.id, { id: review.reviewer.id, fullName: review.reviewer.fullName, role: review.reviewer.role }] as const))).values());
  return <AppShell user={user}><PageHeader title="Credit Committee" description="Only the current assigned approver can view and act on each loan; administrators can monitor all stages." />{!allowed ? <div className="panel p-4 text-sm text-slate-600">Your position is not assigned to Credit Committee review.</div> : <ApprovalDashboard loans={JSON.parse(JSON.stringify(loans))} approvers={approvers} canAssign={canManageSetup(user)} currentUserId={user.id}/>}</AppShell>;
}
