import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { CommitteeQueueTable } from "@/components/CommitteeQueueTable";
import { canAccessAllBranches, isCommitteeAdministrator, isCommitteeParticipant, requireUser } from "@/lib/auth";
import { COMMITTEE_STAGE_ORDER, committeeRoleLabel, stageSlug } from "@/lib/committee-config";
import { pendingQueue } from "@/lib/committee-queue";
import Link from "next/link";

export default async function CommitteePendingPage() {
  const user = await requireUser();
  const allowed = isCommitteeAdministrator(user) || isCommitteeParticipant(user);
  if (!allowed) {
    return (
      <AppShell user={user}>
        <PageHeader title="Loans for Approval" description="Endorsed applications still moving through the credit committees." />
        <div className="panel p-4 text-sm text-slate-600">Your position is not assigned to Credit Committee review.</div>
      </AppShell>
    );
  }

  const entries = await pendingQueue(canAccessAllBranches(user) ? undefined : user.branchId);
  const countByStage = new Map<string, number>();
  for (const entry of entries) {
    if (entry.currentStageKey) countByStage.set(entry.currentStageKey, (countByStage.get(entry.currentStageKey) ?? 0) + 1);
  }

  return (
    <AppShell user={user}>
      <PageHeader
        title="Loans for Approval"
        description={`${entries.length} endorsed application${entries.length === 1 ? "" : "s"} still waiting on a credit committee.`}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {COMMITTEE_STAGE_ORDER.map((roleKey) => {
          const count = countByStage.get(roleKey) ?? 0;
          return (
            <Link
              key={roleKey}
              href={`/committee/${stageSlug(roleKey)}`}
              className={`panel p-4 transition hover:border-alc-blue ${count ? "border-l-4 border-l-alc-blue" : ""}`}
            >
              <div className="label">{committeeRoleLabel(roleKey)}</div>
              <div className={`mt-1 text-2xl font-bold tabular-nums ${count ? "text-alc-blue" : "text-slate-300"}`}>{count}</div>
              <div className="text-xs text-slate-500">{count === 1 ? "loan waiting" : "loans waiting"}</div>
            </Link>
          );
        })}
      </section>

      <div className="mt-5">
        <CommitteeQueueTable entries={entries} emptyMessage="No endorsed loans are waiting for approval." />
      </div>
    </AppShell>
  );
}
