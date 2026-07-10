import { AppShell } from "@/components/AppShell";
import { CommitteeReviewForm } from "@/components/CommitteeReviewForm";
import { PageHeader } from "@/components/PageHeader";
import { canAccessAllBranches, canReviewCredit, requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CommitteePage() {
  const user = await requireUser();
  const where = canAccessAllBranches(user)
    ? {}
    : {
        OR: [
          { reviewerId: user.id },
          { loanApplication: { branchId: user.branchId } }
        ]
      };
  const reviews = canReviewCredit(user)
    ? await prisma.creditCommitteeReview.findMany({
        where,
        include: {
          creditCommittee: true,
          reviewer: true,
          loanApplication: { include: { applicantProfile: true, branch: true, scorecard: true } }
        },
        orderBy: { createdAt: "desc" }
      })
    : [];

  return (
    <AppShell user={user}>
      <PageHeader title="Credit Committee Review" description="Applications routed by amount and authority level." />
      {!canReviewCredit(user) ? <div className="panel p-4 text-sm text-slate-600">Your role is not assigned to committee review.</div> : null}
      <div className="space-y-4">
        {reviews.map((review) => (
          <article key={review.id} className="panel p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <div>
                <div className="text-xs font-semibold text-slate-500">{review.creditCommittee.committeeName}</div>
                <h2 className="mt-1 text-lg font-bold">{review.loanApplication.applicationNo} / {review.loanApplication.applicantProfile?.fullName ?? "Incomplete profile"}</h2>
                <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-4">
                  <span>{review.loanApplication.branch.branchName}</span>
                  <span>{money(review.loanApplication.amountApplied)}</span>
                  <span>{review.loanApplication.status.replaceAll("_", " ")}</span>
                  <span>{review.loanApplication.scorecard ? `${Number(review.loanApplication.scorecard.overallScore).toFixed(2)}%` : "No score"}</span>
                </div>
                <div className="mt-3 text-sm">Reviewer: {review.reviewer.fullName} / Decision: <strong>{review.decision.replaceAll("_", " ")}</strong></div>
              </div>
              <CommitteeReviewForm reviewId={review.id} currentDecision={review.decision} />
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
