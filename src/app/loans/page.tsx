import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { LoanCreateForm } from "@/components/LoanCreateForm";
import { canAccessAllBranches, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

export default async function LoansPage({ searchParams }: { searchParams?: Promise<{ q?: string; status?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp?.q?.trim();
  const status = sp?.status?.trim();
  const where = {
    ...(canAccessAllBranches(user) ? {} : { branchId: user.branchId }),
    ...(status ? { status: status as never } : {}),
    ...(q
      ? {
          OR: [
            { applicationNo: { contains: q } },
            { ciFormNo: { contains: q } },
            { applicantProfile: { fullName: { contains: q } } },
            { branchCode: { contains: q } }
          ]
        }
      : {})
  };
  const loans = await prisma.loanApplication.findMany({
    where,
    include: { applicantProfile: true, branch: true, loanOfficer: true, scorecard: true },
    orderBy: { createdAt: "desc" }
  });
  const officers = await prisma.user.findMany({
    where: canAccessAllBranches(user)
      ? { role: "ACCOUNT_OFFICER", status: "ACTIVE" }
      : { role: "ACCOUNT_OFFICER", status: "ACTIVE", branchId: user.branchId },
    include: { branch: true },
    orderBy: { fullName: "asc" }
  });
  const loanProducts = await prisma.loanProduct.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });

  return (
    <AppShell user={user}>
      <PageHeader title="Loan Applications" description="Encode CI/BI transactions and keep them branch-tagged." />
      <LoanCreateForm
        officers={officers.map((o) => ({ id: o.id, fullName: o.fullName, branchCode: o.branch.branchCode, branchName: o.branch.branchName }))}
        loanProducts={loanProducts.map((p) => p.name)}
        currentUser={{ id: user.id, fullName: user.fullName, role: user.role, branchCode: user.branchCode, branchName: user.branchName }}
      />
      <form className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_120px]">
        <input className="input" name="q" placeholder="Search applicant, application no., CI form no., branch" defaultValue={q} />
        <select className="input" name="status" defaultValue={status}>
          <option value="">All statuses</option>
          {["DRAFT", "CI_BI_IN_PROGRESS", "FOR_SCORECARD", "AUTO_DENIED", "FOR_CREDIT_COMMITTEE", "PROCEED", "APPROVED", "DENIED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
          ))}
        </select>
        <button className="btn-secondary">Filter</button>
      </form>
      <section className="panel mt-5 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">CI Date</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Officer</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <Link className="font-semibold text-alc-blue hover:underline" href={`/loans/${loan.id}`}>{loan.applicationNo}</Link>
                  <div className="text-xs text-slate-500">{loan.ciFormNo ?? "No CI form no."}</div>
                </td>
                <td className="px-4 py-3">{loan.applicantProfile?.fullName ?? "Incomplete profile"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{loan.dateOfCi ? loan.dateOfCi.toLocaleDateString("en-CA") : "-"}</td>
                <td className="px-4 py-3">{loan.branch.branchCode}</td>
                <td className="px-4 py-3">{loan.loanOfficer.fullName}</td>
                <td className="px-4 py-3">{loan.scorecard ? `${Number(loan.scorecard.overallScore).toFixed(2)}%` : "-"}</td>
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
