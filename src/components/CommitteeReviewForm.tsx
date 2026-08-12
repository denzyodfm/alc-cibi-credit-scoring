"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommitteeReviewForm({ reviewId, currentDecision, review }: { reviewId: number; currentDecision: string; review?: any }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    await fetch(`/api/committee-reviews/${reviewId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form))
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
      <select className="input" name="decision" defaultValue={currentDecision}>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="DENIED">Denied</option>
        <option value="RETURNED_FOR_COMPLETION">Returned for completion</option>
      </select>
      <div className="grid gap-2 sm:grid-cols-2"><input className="input" name="recommendedAmount" type="number" step="0.01" placeholder="Recommended amount" defaultValue={review?.recommendedAmount ?? ""}/><input className="input" name="recommendedTerms" type="number" placeholder="Terms (months)" defaultValue={review?.recommendedTerms ?? ""}/></div>
      <textarea className="input min-h-24" name="remarks" placeholder="Professional review remarks" defaultValue={review?.remarks ?? ""} />
      {review?.approvalCode ? <div className="rounded-md bg-white p-2 text-xs"><strong>Approval code:</strong> {review.approvalCode}<br/><strong>Timestamp:</strong> {String(review.reviewedAt).replace("T"," ").slice(0,19)}</div> : null}
      <button className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Record decision"}</button>
    </form>
  );
}
