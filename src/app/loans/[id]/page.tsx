import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LoanEditor } from "@/components/LoanEditor";
import { PageHeader } from "@/components/PageHeader";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScorecardRules } from "@/lib/scorecard";

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await params;
  const id = Number(rawId);
  const loan = await prisma.loanApplication.findUnique({
    where: { id },
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
      scorecard: { include: { items: true } },
      committeeReviews: { include: { creditCommittee: true, reviewer: true } }
    }
  });
  if (!loan || !canAccessBranch(user, loan.branchId)) notFound();
  const rules = await getScorecardRules();

  return (
    <AppShell user={user}>
      <PageHeader title={loan.applicationNo} description={`${loan.branch.branchName} / ${loan.status.replaceAll("_", " ")}`} />
      <LoanEditor
        loan={JSON.parse(JSON.stringify(loan))}
        criteria={JSON.parse(JSON.stringify(rules.criteria))}
        settings={JSON.parse(JSON.stringify(rules.settings))}
      />
    </AppShell>
  );
}
