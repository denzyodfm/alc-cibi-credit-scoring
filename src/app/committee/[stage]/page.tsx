import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { CommitteeQueueTable } from "@/components/CommitteeQueueTable";
import { CommitteeDecisionForm } from "@/components/CommitteeDecisionForm";
import { canAccessAllBranches, isCommitteeAdministrator, isCommitteeParticipant, requireUser } from "@/lib/auth";
import { committeeRoleLabel, stageKeyFromSlug, tiersUsingStage } from "@/lib/committee-config";
import { stageQueue } from "@/lib/committee-queue";
import { prisma } from "@/lib/prisma";

export default async function CommitteeStagePage({ params }: { params: Promise<{ stage: string }> }) {
  const user = await requireUser();
  const { stage } = await params;
  const roleKey = stageKeyFromSlug(stage);
  if (!roleKey) notFound();

  const label = committeeRoleLabel(roleKey);
  const allowed = isCommitteeAdministrator(user) || isCommitteeParticipant(user);
  if (!allowed) {
    return (
      <AppShell user={user}>
        <PageHeader title={label} description="Credit committee queue." />
        <div className="panel p-4 text-sm text-slate-600">Your position is not assigned to Credit Committee review.</div>
      </AppShell>
    );
  }

  const entries = await stageQueue(roleKey, canAccessAllBranches(user) ? undefined : user.branchId);
  const tiers = tiersUsingStage(roleKey);

  // Only the person holding this seat may act, unless they administer the committee setup.
  const seats = await prisma.branchCommitteeAssignment.findMany({ where: { roleKey }, select: { userId: true } });
  const holdsSeat = seats.some((seat) => seat.userId === user.id);
  const canAct = holdsSeat || isCommitteeAdministrator(user);

  return (
    <AppShell user={user}>
      <PageHeader
        title={label}
        description={`${entries.length} loan${entries.length === 1 ? "" : "s"} waiting on this committee. Reviews: ${tiers
          .map((tier) => tier.label)
          .join(", ")}.`}
      />
      {!canAct ? (
        <div className="panel mb-5 p-4 text-sm text-slate-600">
          You can see this queue, but only the assigned {label} can approve or send loans back.
        </div>
      ) : null}
      <CommitteeQueueTable
        entries={entries}
        showStage={false}
        emptyMessage={`No loans are waiting on the ${label} right now.`}
        action={(entry) =>
          entry.currentReviewId ? <CommitteeDecisionForm reviewId={entry.currentReviewId} canAct={canAct} /> : null
        }
      />
    </AppShell>
  );
}
