import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { dateText, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PrintableReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await params;
  const loan = await prisma.loanApplication.findUnique({
    where: { id: Number(rawId) },
    include: {
      branch: true,
      loanOfficer: true,
      applicantProfile: true,
      householdBackground: true,
      incomeProfile: true,
      liabilities: true,
      references: true,
      assets: true,
      collateral: true,
      scorecard: { include: { items: { orderBy: [{ category: "asc" }, { subCriterionCode: "asc" }] } } }
    }
  });
  if (!loan || !canAccessBranch(user, loan.branchId)) notFound();

  return (
    <AppShell user={user}>
      <PageHeader title="Printable CI/BI Report" description={loan.applicationNo} action={<PrintButton />} />
      <div className="panel p-6 print:border-0 print:shadow-none">
        <div className="flex justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold">Agusan Lending Corporation</h1>
            <p className="text-sm text-slate-600">CI/BI and 5C Credit Scorecard Report</p>
          </div>
          <div className="text-right text-sm">
            <div>{loan.branch.branchName} ({loan.branchCode})</div>
            <div>{dateText(loan.dateOfCi)}</div>
          </div>
        </div>
        <Section title="Loan Details">
          <Info label="Application no." value={loan.applicationNo} />
          <Info label="CI form no." value={loan.ciFormNo} />
          <Info label="Loan officer" value={loan.loanOfficer.fullName} />
          <Info label="Product" value={loan.loanProduct} />
          <Info label="Amount" value={money(loan.amountApplied)} />
          <Info label="Status" value={loan.status.replaceAll("_", " ")} />
          <Info label="Purpose" value={loan.loanPurpose} wide />
        </Section>
        <Section title="Applicant Profile">
          <Info label="Full name" value={loan.applicantProfile?.fullName} />
          <Info label="Contact" value={loan.applicantProfile?.contactNumber} />
          <Info label="Civil status" value={loan.applicantProfile?.civilStatus} />
          <Info label="Address" value={loan.applicantProfile?.currentAddress} wide />
        </Section>
        <Section title="Income and Liabilities">
          <Info label="Employment" value={loan.incomeProfile?.employmentStatus} />
          <Info label="Employer/business" value={loan.incomeProfile?.employerName ?? loan.incomeProfile?.businessName} />
          <Info label="Gross income" value={money(loan.incomeProfile?.grossMonthlySalary ?? loan.incomeProfile?.averageMonthlyGrossRevenue)} />
          <Info label="Net income" value={money(loan.incomeProfile?.netMonthlyTakeHomePay ?? loan.incomeProfile?.averageMonthlyNetIncome)} />
        </Section>
        <Section title="5C Scorecard">
          <Info label="Character" value={loan.scorecard ? `${Number(loan.scorecard.characterScore).toFixed(2)}%` : "-"} />
          <Info label="Capacity" value={loan.scorecard ? `${Number(loan.scorecard.capacityScore).toFixed(2)}%` : "-"} />
          <Info label="Capital" value={loan.scorecard ? `${Number(loan.scorecard.capitalScore).toFixed(2)}%` : "-"} />
          <Info label="Collateral" value={loan.scorecard ? `${Number(loan.scorecard.collateralScore).toFixed(2)}%` : "-"} />
          <Info label="Conditions" value={loan.scorecard ? `${Number(loan.scorecard.conditionsScore).toFixed(2)}%` : "-"} />
          <Info label="Overall" value={loan.scorecard ? `${Number(loan.scorecard.overallScore).toFixed(2)}%` : "-"} />
          <Info label="Recommendation" value={loan.scorecard?.result} />
          <Info label="Auto-DQ reason" value={loan.scorecard?.autoDqReason} wide />
        </Section>
        <table className="mt-4 w-full text-sm">
          <thead className="table-head"><tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">Criterion</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">N/A</th><th className="px-3 py-2">Remarks</th></tr></thead>
          <tbody>
            {loan.scorecard?.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{item.subCriterionCode}</td>
                <td className="px-3 py-2">{item.subCriterionName}</td>
                <td className="px-3 py-2">{item.score}</td>
                <td className="px-3 py-2">{item.isNa ? item.naTreatment.replaceAll("_", " ") : "No"}</td>
                <td className="px-3 py-2">{item.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-bold">{title}</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">{children}</div>
    </section>
  );
}

function Info({ label, value, wide }: { label: string; value: unknown; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-3" : ""}>
      <div className="label">{label}</div>
      <div className="mt-1 text-sm">{String(value ?? "-")}</div>
    </div>
  );
}
