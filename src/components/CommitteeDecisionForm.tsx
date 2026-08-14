"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Undo2 } from "lucide-react";

/**
 * Approve advances the loan to the next committee; Back returns it to the Account Officer and
 * clears the chain, so a reason is mandatory — it is the only thing the officer will see.
 */
export function CommitteeDecisionForm({ reviewId, canAct }: { reviewId: number; canAct: boolean }) {
  const router = useRouter();
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState<"" | "APPROVED" | "RETURNED_FOR_COMPLETION">("");
  const [error, setError] = useState("");

  async function submit(decision: "APPROVED" | "RETURNED_FOR_COMPLETION") {
    if (decision === "RETURNED_FOR_COMPLETION" && !remarks.trim()) {
      setError("Give the Account Officer a reason before sending this back.");
      return;
    }
    setBusy(decision);
    setError("");
    const response = await fetch(`/api/committee-reviews/${reviewId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, remarks })
    });
    setBusy("");
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Could not record the decision.");
      return;
    }
    setRemarks("");
    router.refresh();
  }

  if (!canAct) {
    return <p className="text-xs text-slate-500">Waiting on the assigned approver for this stage.</p>;
  }

  return (
    <div className="w-full max-w-sm">
      <textarea
        className="input min-h-16"
        placeholder="Remarks (required when sending back)"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
      />
      {error ? <div className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={Boolean(busy)} onClick={() => submit("APPROVED")}>
          <Check /> {busy === "APPROVED" ? "Approving..." : "Approve"}
        </button>
        <button type="button" className="btn-secondary" disabled={Boolean(busy)} onClick={() => submit("RETURNED_FOR_COMPLETION")}>
          <Undo2 /> {busy === "RETURNED_FOR_COMPLETION" ? "Sending back..." : "Back"}
        </button>
      </div>
    </div>
  );
}
