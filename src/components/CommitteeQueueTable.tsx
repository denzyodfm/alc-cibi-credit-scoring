import Link from "next/link";
import type { QueueEntry } from "@/lib/committee-queue";
import { dateText, money } from "@/lib/format";

/**
 * Board of loans with the committee stage each one is waiting on. Used by the overview, the
 * per-committee queues, and the approved list, so the three stay visually consistent.
 */
export function CommitteeQueueTable({
  entries,
  emptyMessage,
  showStage = true,
  action
}: {
  entries: QueueEntry[];
  emptyMessage: string;
  showStage?: boolean;
  action?: (entry: QueueEntry) => React.ReactNode;
}) {
  if (!entries.length) {
    return <div className="panel p-6 text-sm text-slate-500">{emptyMessage}</div>;
  }

  return (
    <section className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Account Officer</th>
              <th className="px-4 py-3 text-right">Amount</th>
              {showStage ? <th className="px-4 py-3">Sitting with</th> : null}
              <th className="px-4 py-3">Progress</th>
              {action ? <th className="px-4 py-3 text-right">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3">
                  <Link className="font-semibold text-alc-blue hover:underline" href={`/loans/${entry.id}`}>
                    {entry.applicationNo}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {entry.endorsementCode ?? "Not endorsed"} · {dateText(entry.endorsedAt)}
                  </div>
                </td>
                <td className="px-4 py-3">{entry.applicantName}</td>
                <td className="px-4 py-3">{entry.branchCode}</td>
                <td className="px-4 py-3">{entry.loanOfficer}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(entry.amountApplied)}</td>
                {showStage ? (
                  <td className="px-4 py-3">
                    {entry.currentStageLabel ? (
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                        {entry.currentStageLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">All stages cleared</span>
                    )}
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <div className="text-xs text-slate-600">
                    Stage {entry.stageNumber} of {entry.stageCount}
                  </div>
                  <StageTrail entry={entry} />
                </td>
                {action ? <td className="px-4 py-3 text-right">{action(entry)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Compact per-stage state, so it is obvious who has signed and who has not. */
function StageTrail({ entry }: { entry: QueueEntry }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {entry.stages.map((stage) => {
        const tone =
          stage.decision === "APPROVED"
            ? "bg-emerald-50 text-emerald-800"
            : stage.decision === "DENIED"
              ? "bg-red-50 text-red-700"
              : stage.sequence === entry.stageNumber
                ? "bg-blue-100 text-blue-900"
                : "bg-slate-100 text-slate-500";
        return (
          <span
            key={stage.sequence}
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}
            title={
              stage.decision === "APPROVED"
                ? `${stage.label} — ${stage.reviewer} — ${stage.approvalCode ?? ""} — ${dateText(stage.reviewedAt)}`
                : `${stage.label} — ${stage.reviewer}`
            }
          >
            {stage.sequence}. {stage.label}
          </span>
        );
      })}
    </div>
  );
}
