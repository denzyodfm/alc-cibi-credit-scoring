import { AppShell } from "@/components/AppShell";
import { CommitteeReviewForm } from "@/components/CommitteeReviewForm";
import { PageHeader } from "@/components/PageHeader";
import { canAccessAllBranches, canReviewCredit, requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { EndorsementForm } from "@/components/EndorsementForm";

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
  const endorsements = canReviewCredit(user) ? await prisma.loanApplication.findMany({ where: { status: "FOR_ENDORSEMENT", ...(canAccessAllBranches(user) ? {} : { branchId: user.branchId }) }, include: { applicantProfile: true, branch: true, loanOfficer: true, scorecard: true }, orderBy: { updatedAt: "asc" } }) : [];

  return (
    <AppShell user={user}>
      <PageHeader title="Endorsement & Credit Committee" description="Endorse CI/BI findings first, then complete sequential amount-based approvals." />
      {!canReviewCredit(user) ? <div className="panel p-4 text-sm text-slate-600">Your role is not assigned to committee review.</div> : null}
      <section className="mb-6"><h2 className="mb-3 text-lg font-bold">For Endorsement</h2><div className="grid gap-4 xl:grid-cols-2">{endorsements.map((loan)=><article key={loan.id} className="panel p-5"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase text-blue-600">{loan.branch.branchName}</div><Link href={`/loans/${loan.id}`} className="mt-1 block text-lg font-bold text-alc-blue hover:underline">{loan.applicationNo} / {loan.applicantProfile?.fullName}</Link><div className="mt-2 text-sm text-slate-600">AO: {loan.loanOfficer.fullName} · {money(loan.amountApplied)} · 5C {loan.scorecard ? `${Number(loan.scorecard.overallScore).toFixed(2)}%` : "Pending"}</div></div></div><EndorsementForm loanId={loan.id}/></article>)}{!endorsements.length?<div className="panel p-5 text-sm text-slate-500">No applications awaiting endorsement.</div>:null}</div></section>
      <h2 className="mb-3 text-lg font-bold">Credit Committee Approvals</h2><div className="space-y-4">
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
                <div className="mt-3 text-sm">Reviewer: <strong>{review.reviewer.fullName}</strong> / {review.creditCommittee.committeeName} / Decision: <strong>{review.decision.replaceAll("_", " ")}</strong></div><Link className="mt-3 inline-block text-sm font-semibold text-alc-blue hover:underline" href={`/loans/${review.loanApplicationId}`}>Open complete decision workspace →</Link>
              </div>
              <CommitteeReviewForm reviewId={review.id} currentDecision={review.decision} review={JSON.parse(JSON.stringify(review))} />
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
