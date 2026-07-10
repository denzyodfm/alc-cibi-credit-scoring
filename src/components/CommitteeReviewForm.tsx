"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommitteeReviewForm({ reviewId, currentDecision }: { reviewId: number; currentDecision: string }) {
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
    <form onSubmit={submit} className="grid gap-2">
      <select className="input" name="decision" defaultValue={currentDecision}>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="DENIED">Denied</option>
        <option value="RETURNED_FOR_COMPLETION">Returned for completion</option>
      </select>
      <textarea className="input min-h-20" name="remarks" placeholder="Remarks" />
      <button className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save decision"}</button>
    </form>
  );
}
