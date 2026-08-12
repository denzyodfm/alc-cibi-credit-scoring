import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { LoanProductManager } from "@/components/LoanProductManager";
import { LoanTermManager } from "@/components/LoanTermManager";
import { LookupOptionManager } from "@/components/LookupOptionManager";
import { SettingsTabs } from "@/components/SettingsTabs";
import { CommitteeSettingsManager } from "@/components/CommitteeSettingsManager";
import { BranchMasterManager, PositionManager } from "@/components/MasterTableManager";
import { canManageSetup, requireUser } from "@/lib/auth";
import { APPROVAL_TIERS, COMMITTEE_ROLES } from "@/lib/committee-config";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await requireUser();
  const [products, terms, sexOptions, civilStatusOptions, residenceTypeOptions, branches, users, positions] = await Promise.all([
    prisma.loanProduct.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.loanTermOption.findMany({ orderBy: [{ sortOrder: "asc" }, { months: "asc" }] }),
    prisma.sexOption.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.civilStatusOption.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.residenceTypeOption.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.branch.findMany({ where: { status: "ACTIVE" }, include: { committeeAssignments: { include: { user: true } } }, orderBy: [{ isHeadOffice: "desc" }, { branchCode: "asc" }] }),
    prisma.user.findMany({ where: { status: "ACTIVE" }, include: { branch: true }, orderBy: { fullName: "asc" } }),
    prisma.position.findMany({ include: { _count: { select: { users: true } } }, orderBy: { name: "asc" } })
  ]);
  const canManage = canManageSetup(user);

  return (
    <AppShell user={user}>
      <PageHeader title="Settings" description="Configure lookup values used across loan encoding." />
      {!canManage ? <div className="panel mb-5 p-4 text-sm text-slate-600">Your role can view these settings but cannot add, edit, or delete entries.</div> : null}
      <SettingsTabs
        tabs={[
          {
            id: "loan-products",
            label: "Loan Products",
            content: <LoanProductManager products={products.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }))} canManage={canManage} />
          },
          {
            id: "desired-terms",
            label: "Desired Terms",
            content: <LoanTermManager terms={terms.map((t) => ({ id: t.id, months: t.months, isActive: t.isActive }))} canManage={canManage} />
          },
          {
            id: "sex",
            label: "Sex",
            content: (
              <LookupOptionManager
                title="Sex"
                description="Values available for the Sex selector in the Applicant tab."
                apiBase="/api/settings/sex-options"
                options={sexOptions.map((o) => ({ id: o.id, label: o.label, isActive: o.isActive }))}
                canManage={canManage}
                placeholder="New sex value"
              />
            )
          },
          {
            id: "civil-status",
            label: "Civil Status",
            content: (
              <LookupOptionManager
                title="Civil Status"
                description="Values available for the Civil Status selector in the Applicant tab."
                apiBase="/api/settings/civil-status-options"
                options={civilStatusOptions.map((o) => ({ id: o.id, label: o.label, isActive: o.isActive }))}
                canManage={canManage}
                placeholder="New civil status value"
              />
            )
          },
          {
            id: "residence-type",
            label: "Type of Residence",
            content: (
              <LookupOptionManager
                title="Type of Residence"
                description="Values available for the Type of Residence selector in the Applicant tab."
                apiBase="/api/settings/residence-types"
                options={residenceTypeOptions.map((o) => ({ id: o.id, label: o.label, isActive: o.isActive }))}
                canManage={canManage}
                placeholder="New residence type value"
                sortable
              />
            )
          },
          {
            id: "credit-committee",
            label: "Credit Committee",
            content: <CommitteeSettingsManager branches={JSON.parse(JSON.stringify(branches))} users={users.map((item)=>({id:item.id,fullName:item.fullName,branchCode:item.branch.branchCode}))} roles={COMMITTEE_ROLES} tiers={APPROVAL_TIERS} canManage={canManage}/>
          },
          {
            id: "positions",
            label: "Positions / Privileges",
            content: <PositionManager items={JSON.parse(JSON.stringify(positions))} canManage={canManage}/>
          },
          {
            id: "branch-master",
            label: "Branches",
            content: <BranchMasterManager items={JSON.parse(JSON.stringify(await prisma.branch.findMany({include:{_count:{select:{users:true,loanApplications:true}}},orderBy:{branchCode:"asc"}})))} canManage={canManage}/>
          }
        ]}
      />
    </AppShell>
  );
}
