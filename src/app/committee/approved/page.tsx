import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { CommitteeQueueTable } from "@/components/CommitteeQueueTable";
import { canAccessAllBranches, isCommitteeAdministrator, isCommitteeParticipant, requireUser } from "@/lib/auth";
import { approvedQueue } from "@/lib/committee-queue";
import { money } from "@/lib/format";

export default async function ApprovedLoansPage() {
  const user = await requireUser();
  const allowed = isCommitteeAdministrator(user) || isCommitteeParticipant(user);
  if (!allowed) {
    return (
      <AppShell user={user}>
        <PageHeader title="Approved Loans" description="Applications that cleared every required committee." />
        <div className="panel p-4 text-sm text-slate-600">Your position is not assigned to Credit Committee review.</div>
      </AppShell>
    );
  }

  const entries = await approvedQueue(canAccessAllBranches(user) ? undefined : user.branchId);
  const total = entries.reduce((running, entry) => running + entry.amountApplied, 0);

  return (
    <AppShell user={user}>
      <PageHeader
        title="Approved Loans"
        description={`${entries.length} approved application${entries.length === 1 ? "" : "s"} totalling ${money(total)}.`}
      />
      <CommitteeQueueTable
        entries={entries}
        showStage={false}
        emptyMessage="No loans have completed the full approval chain yet."
      />
    </AppShell>
  );
}
