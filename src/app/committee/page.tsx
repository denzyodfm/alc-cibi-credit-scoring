import { AppShell } from "@/components/AppShell";
import { ApprovalDashboard } from "@/components/ApprovalDashboard";
import { EndorsementForm } from "@/components/EndorsementForm";
import { PageHeader } from "@/components/PageHeader";
import { canAccessAllBranches, canManageSetup, canReviewCredit, requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function CommitteePage() {
  const user = await requireUser();
  const branchScope = canAccessAllBranches(user) ? {} : { branchId: user.branchId };
  const endorsements = canReviewCredit(user) ? await prisma.loanApplication.findMany({ where: { status: "FOR_ENDORSEMENT", ...branchScope }, include: { applicantProfile: true, branch: true, loanOfficer: true, scorecard: true }, orderBy: { updatedAt: "asc" } }) : [];
  const loans = canReviewCredit(user) ? await prisma.loanApplication.findMany({
    where: { status: { in: ["FOR_CREDIT_COMMITTEE", "APPROVED", "DENIED"] }, ...branchScope },
    include: { applicantProfile: true, branch: true, loanOfficer: true, scorecard: true, committeeReviews: { include: { reviewer: true, creditCommittee: true }, orderBy: [{ approvalSequence: "asc" }, { createdAt: "asc" }] } },
    orderBy: { updatedAt: "desc" }
  }) : [];
  const approvers = canReviewCredit(user) ? await prisma.user.findMany({ where: { status: "ACTIVE", role: { in: ["SUPER_ADMIN", "HEAD_OFFICE_ADMIN", "HEAD_OFFICE_CREDIT_COMMITTEE", "BRANCH_TEAM_LEADER", "AREA_TEAM_LEADER"] } }, select: { id: true, fullName: true, role: true }, orderBy: { id: "asc" } }) : [];

  return <AppShell user={user}>
    <PageHeader title="Endorsement & Credit Committee" description="Endorse CI/BI findings, inspect complete loan records, and track each approval stage." />
    {!canReviewCredit(user) ? <div className="panel p-4 text-sm text-slate-600">Your role is not assigned to committee review.</div> : null}
    <section className="mb-7"><h2 className="mb-3 text-lg font-bold">For Endorsement</h2><div className="grid gap-4 xl:grid-cols-2">{endorsements.map((loan)=><article key={loan.id} className="panel p-5"><div className="flex items-start gap-4">{loan.applicantProfile?.photoDataUrl ? <img className="h-16 w-16 rounded-xl object-cover" src={loan.applicantProfile.photoDataUrl} alt=""/> : null}<div className="min-w-0 flex-1"><div className="text-xs font-bold uppercase text-blue-600">{loan.branch.branchName}</div><Link href={`/loans/${loan.id}`} className="mt-1 block text-lg font-bold text-blue-950 hover:underline">{loan.applicationNo} / {loan.applicantProfile?.fullName}</Link><div className="mt-2 text-sm text-slate-600">AO: {loan.loanOfficer.fullName} · {money(loan.amountApplied)} · 5C {loan.scorecard ? `${Number(loan.scorecard.overallScore).toFixed(2)}%` : "Pending"}</div></div></div><EndorsementForm loanId={loan.id}/></article>)}{!endorsements.length?<div className="panel p-5 text-sm text-slate-500">No applications awaiting endorsement.</div>:null}</div></section>
    {canReviewCredit(user) ? <ApprovalDashboard loans={JSON.parse(JSON.stringify(loans))} approvers={approvers} canAssign={canManageSetup(user)} currentUserId={user.id}/> : null}
  </AppShell>;
}
