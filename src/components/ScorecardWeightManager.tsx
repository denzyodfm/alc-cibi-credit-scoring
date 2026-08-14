"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

type Weight = { category: string; weightPercent: number };

export function ScorecardWeightManager({ weights, canManage }: { weights: Weight[]; canManage: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState(() => weights.map((row) => ({ ...row, weightPercent: String(row.weightPercent) })));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + (Number.isFinite(Number(row.weightPercent)) ? Number(row.weightPercent) : 0), 0),
    [rows]
  );
  const balanced = Math.abs(total - 100) < 0.01;

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/settings/scorecard-weights", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weights: rows.map((row) => ({ category: row.category, weightPercent: Number(row.weightPercent) })) })
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Could not save the weights.");
      return;
    }
    setMessage("Weights saved. New scores use these immediately; existing scorecards keep the weights they were scored with until re-saved.");
    router.refresh();
  }

  return (
    <div>
      <p className="text-sm text-slate-600">
        Category weights used by the 5C scorecard. They must total 100% — the overall score is the sum of each
        category&apos;s normalised score times its weight.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row, index) => (
          <label key={row.category}>
            <span className="label">{row.category}</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={row.weightPercent}
                disabled={!canManage}
                onChange={(e) =>
                  setRows((current) => current.map((item, i) => (i === index ? { ...item, weightPercent: e.target.value } : item)))
                }
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </label>
        ))}
      </div>

      <div className={`mt-4 rounded-md px-4 py-3 text-sm ${balanced ? "bg-slate-50 text-slate-700" : "bg-red-50 text-red-700"}`}>
        Total: <strong className="tabular-nums">{total.toFixed(2)}%</strong>
        {balanced ? "" : " — must be exactly 100% before this can be saved."}
      </div>

      {error ? <div className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="mt-3 rounded-md bg-teal-50 px-4 py-3 text-sm text-teal-800">{message}</div> : null}

      {canManage ? (
        <button className="btn-primary mt-4" type="button" disabled={saving || !balanced} onClick={save}>
          <Save /> {saving ? "Saving..." : "Save weights"}
        </button>
      ) : null}
    </div>
  );
}
