import { Undo2 } from "lucide-react";
import { dateText } from "@/lib/format";

/**
 * Tells the Account Officer that a committee sent the loan back, and why.
 *
 * Shown only while the loan is waiting on the officer again — sending a loan back clears the
 * endorsement, so a return with no endorsement date is one that has not been re-submitted yet.
 * Once it is re-endorsed the notice disappears and the remark stays as history on the record.
 */
export function ReturnedNotice({
  returnedFromRole,
  returnedRemarks,
  returnedByName,
  returnedAt,
  endorsedAt
}: {
  returnedFromRole?: string | null;
  returnedRemarks?: string | null;
  returnedByName?: string | null;
  returnedAt?: Date | string | null;
  endorsedAt?: Date | string | null;
}) {
  if (!returnedAt || endorsedAt) return null;

  return (
    <section className="no-print mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <Undo2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="min-w-0">
          <h2 className="font-bold text-amber-900">
            Sent back by the {returnedFromRole ?? "credit committee"}
          </h2>
          <p className="mt-1 text-sm text-amber-900">
            {returnedRemarks?.trim() || "No reason was recorded."}
          </p>
          <p className="mt-2 text-xs text-amber-800">
            {returnedByName ? `${returnedByName} · ` : ""}
            {dateText(returnedAt)} · Correct the details below, save, re-score, then have it endorsed again. The
            approval chain restarts at the Bookkeeper.
          </p>
        </div>
      </div>
    </section>
  );
}
