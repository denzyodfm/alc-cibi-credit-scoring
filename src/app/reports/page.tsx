import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { canAccessAllBranches, requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const user = await requireUser();
  const branchWhere = canAccessAllBranches(user) ? {} : { branchId: user.branchId };
  const [loans, branches, officers] = await Promise.all([
    prisma.loanApplication.findMany({ where: branchWhere, include: { applicantProfile: { select: { fullName: true } }, branch: true, loanOfficer: true, scorecard: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.loanApplication.groupBy({ by: ["branchCode"], where: branchWhere, _count: true, _sum: { amountApplied: true } }),
    prisma.loanApplication.groupBy({ by: ["loanOfficerId"], where: branchWhere, _count: true })
  ]);

  return (
    <AppShell user={user}>
      <PageHeader title="Reports" description="Printable CI/BI reports, scorecards, branch summaries, and officer productivity." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4">
          <h2 className="font-semibold">Branch loan application summary</h2>
          <div className="mt-3 space-y-2 text-sm">
            {branches.map((branch) => (
              <div key={branch.branchCode} className="flex justify-between rounded-md bg-slate-50 px-3 py-2">
                <span>{branch.branchCode}</span>
                <span>{branch._count} apps / {money(branch._sum.amountApplied)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel p-4">
          <h2 className="font-semibold">Account Officer productivity summary</h2>
          <div className="mt-3 space-y-2 text-sm">
            {officers.map((officer) => <div key={officer.loanOfficerId} className="rounded-md bg-slate-50 px-3 py-2">Officer #{officer.loanOfficerId}: {officer._count} applications</div>)}
          </div>
        </section>
      </div>
      <section className="panel mt-5 overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 font-semibold">Printable CI/BI and scorecard reports</div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{loan.applicationNo}</td>
                <td className="px-4 py-3">{loan.applicantProfile?.fullName ?? "-"}</td>
                <td className="px-4 py-3">{loan.branch.branchCode}</td>
                <td className="px-4 py-3">{loan.scorecard?.result ?? "-"}</td>
                <td className="px-4 py-3 text-right"><Link className="text-alc-blue hover:underline" href={`/reports/${loan.id}`}>Open report</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </AppShell>
  );
}
