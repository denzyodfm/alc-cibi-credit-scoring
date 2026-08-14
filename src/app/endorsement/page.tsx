import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EndorsementForm } from "@/components/EndorsementForm";
import { PageHeader } from "@/components/PageHeader";
import { canAccessAllBranches, canEndorseCredit, requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function EndorsementPage() {
  const user = await requireUser();
  const allowed = canEndorseCredit(user);
  const loans = allowed ? await prisma.loanApplication.findMany({ where: { status: "FOR_ENDORSEMENT", ...(canAccessAllBranches(user) ? {} : { branchId: user.branchId }) }, include: { applicantProfile: { select: { fullName: true, photoDataUrl: true } }, branch: true, loanOfficer: true, scorecard: true }, orderBy: { updatedAt: "asc" }, take: 100 }) : [];
  return <AppShell user={user}><PageHeader title="Endorsement" description="Passing CI/BI applications awaiting Account Assistant endorsement." />{!allowed ? <div className="panel p-5 text-sm text-slate-600">Only Account Assistants and setup administrators can view endorsement records.</div> : <div className="grid gap-4 xl:grid-cols-2">{loans.map((loan)=><article key={loan.id} className="panel border-l-4 border-l-blue-600 p-5"><div className="flex items-start gap-4">{loan.applicantProfile?.photoDataUrl?<img className="h-20 w-20 rounded-xl object-cover" src={loan.applicantProfile.photoDataUrl} alt=""/>:<div className="grid h-20 w-20 place-items-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">NO PHOTO</div>}<div className="min-w-0 flex-1"><div className="text-xs font-bold uppercase text-blue-600">{loan.branch.branchName}</div><Link href={`/loans/${loan.id}`} className="mt-1 block text-lg font-black text-blue-950 hover:underline">{loan.applicationNo} / {loan.applicantProfile?.fullName || "Incomplete profile"}</Link><div className="mt-2 text-sm text-slate-600">Account Officer: {loan.loanOfficer.fullName}</div><div className="mt-1 text-sm">{money(loan.amountApplied)} · CI/BI grade <strong className="text-emerald-700">{loan.scorecard?`${Number(loan.scorecard.overallScore).toFixed(2)}%`:"Pending"}</strong></div></div></div><EndorsementForm loanId={loan.id}/></article>)}{!loans.length?<div className="panel p-6 text-sm text-slate-500">No passing CI/BI applications are awaiting endorsement.</div>:null}</div>}</AppShell>;
}
