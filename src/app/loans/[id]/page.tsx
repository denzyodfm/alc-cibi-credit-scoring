import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LoanEditor } from "@/components/LoanEditor";
import { PageHeader } from "@/components/PageHeader";
import { ApplicantPhotoCard } from "@/components/ApplicantPhotoCard";
import { LoanProcessingWorkspace } from "@/components/LoanProcessingWorkspace";
import { canAccessAllBranches, canAccessBranch, requireUser } from "@/lib/auth";
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
      attachedProperties: true,
      businessContacts: true,
      cashFlows: { orderBy: { sortOrder: "asc" } },
      cropProductions: true,
      farmCostItems: true,
      scorecard: { include: { items: true } },
      committeeReviews: { include: { creditCommittee: true, reviewer: true } },
      requirements: true,
      sectionRemarks: true,
      computation: true,
      endorser: true
    }
  });
  if (!loan || !canAccessBranch(user, loan.branchId)) notFound();
  const rules = await getScorecardRules();
  const [officers, loanProducts, loanTermOptions, sexOptions, civilStatusOptions, residenceTypeOptions, addressLocations] = await Promise.all([
    prisma.user.findMany({
      where: canAccessAllBranches(user)
        ? { role: "ACCOUNT_OFFICER", status: "ACTIVE" }
        : { role: "ACCOUNT_OFFICER", status: "ACTIVE", branchId: user.branchId },
      include: { branch: true },
      orderBy: { fullName: "asc" }
    }),
    prisma.loanProduct.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.loanTermOption.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { months: "asc" }] }),
    prisma.sexOption.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.civilStatusOption.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.residenceTypeOption.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.addressBarangay.findMany({ orderBy: [{ region: "asc" }, { province: "asc" }, { cityMunicipality: "asc" }, { barangay: "asc" }] })
  ]);

  return (
    <AppShell user={user}>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_10rem]">
        <div className="min-w-0">
          <PageHeader title={loan.applicationNo} description={`${loan.branch.branchName} / ${loan.status.replaceAll("_", " ")}`} />
          <LoanEditor
            loan={JSON.parse(JSON.stringify(loan))}
            criteria={JSON.parse(JSON.stringify(rules.criteria))}
            settings={JSON.parse(JSON.stringify(rules.settings))}
            currentUser={{ id: user.id, fullName: user.fullName, role: user.role, branchCode: user.branchCode, branchName: user.branchName }}
            officers={officers.map((o) => ({ id: o.id, fullName: o.fullName, branchCode: o.branch.branchCode, branchName: o.branch.branchName }))}
            loanProducts={loanProducts.map((p) => p.name)}
            loanTermOptions={loanTermOptions.map((t) => `${t.months} months`)}
            sexOptions={sexOptions.map((s) => s.label)}
            civilStatusOptions={civilStatusOptions.map((c) => c.label)}
            residenceTypeOptions={residenceTypeOptions.map((r) => r.label)}
            addressLocations={addressLocations.map((l) => ({ region: l.region, province: l.province, cityMunicipality: l.cityMunicipality, barangay: l.barangay }))}
          />
          {["ENDORSED", "FOR_CREDIT_COMMITTEE", "APPROVED", "DENIED"].includes(loan.status) ? (
            <LoanProcessingWorkspace loan={JSON.parse(JSON.stringify(loan))} canReview={user.role !== "ACCOUNT_OFFICER"} />
          ) : null}
        </div>
        <div className="justify-self-end">
          <ApplicantPhotoCard loanId={loan.id} initialPhoto={loan.applicantProfile?.photoDataUrl} />
        </div>
      </div>
    </AppShell>
  );
}
