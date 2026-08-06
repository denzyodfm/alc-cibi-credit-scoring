import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { canAccessAllBranches, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

const statuses = ["DRAFT", "CI_BI_IN_PROGRESS", "FOR_CREDIT_COMMITTEE", "AUTO_DENIED", "APPROVED", "DENIED"] as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const branchWhere = canAccessAllBranches(user) ? {} : { branchId: user.branchId };
  const [total, byStatus, amount, recent] = await Promise.all([
    prisma.loanApplication.count({ where: branchWhere }),
    Promise.all(statuses.map(async (status) => ({ status, count: await prisma.loanApplication.count({ where: { ...branchWhere, status } }) }))),
    prisma.loanApplication.aggregate({ where: branchWhere, _sum: { amountApplied: true } }),
    prisma.loanApplication.findMany({
      where: branchWhere,
      include: { applicantProfile: true, branch: true, loanOfficer: true },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  return (
    <AppShell user={user}>
      <PageHeader title="Dashboard" description="Branch-aware CI/BI workload and credit decision status." />
      <div className="grid gap-4 md:grid-cols-4">
        <div className="panel p-4">
          <div className="text-sm text-slate-500">Total applications</div>
          <div className="mt-2 text-3xl font-bold">{total}</div>
        </div>
        <div className="panel p-4">
          <div className="text-sm text-slate-500">Amount applied</div>
          <div className="mt-2 text-3xl font-bold">{money(amount._sum.amountApplied)}</div>
        </div>
        {byStatus.slice(2, 4).map((item) => (
          <div className="panel p-4" key={item.status}>
            <div className="text-sm text-slate-500">{item.status.replaceAll("_", " ")}</div>
            <div className="mt-2 text-3xl font-bold">{item.count}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {byStatus.map((item) => (
          <div key={item.status} className="panel p-4">
            <div className="text-xs font-semibold text-slate-500">{item.status.replaceAll("_", " ")}</div>
            <div className="mt-1 text-2xl font-bold">{item.count}</div>
          </div>
        ))}
      </div>
      <section className="panel mt-5 overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 font-semibold">Recent applications</div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Officer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((loan) => (
              <tr key={loan.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{loan.applicationNo}</td>
                <td className="px-4 py-3">{loan.applicantProfile?.fullName ?? "Incomplete profile"}</td>
                <td className="px-4 py-3">{loan.branch.branchName}</td>
                <td className="px-4 py-3">{loan.loanOfficer.fullName}</td>
                <td className="px-4 py-3">{loan.status.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 text-right">{money(loan.amountApplied)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </AppShell>
  );
}
