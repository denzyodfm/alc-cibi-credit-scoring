"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X, Check } from "lucide-react";

type LoanTerm = { id: number; months: number; isActive: boolean };

export function LoanTermManager({ terms, canManage }: { terms: LoanTerm[]; canManage: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(terms);
  const [months, setMonths] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingMonths, setEditingMonths] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!months.trim()) return;
    setSaving(true);
    const res = await fetch("/api/settings/loan-terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ months: Number(months) })
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      setItems((current) => [...current, created].sort((a, b) => a.months - b.months));
      setMonths("");
      router.refresh();
    }
  }

  async function save(id: number) {
    if (!editingMonths.trim()) return;
    const res = await fetch(`/api/settings/loan-terms/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ months: Number(editingMonths) })
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((current) => current.map((item) => (item.id === id ? updated : item)).sort((a, b) => a.months - b.months));
      setEditingId(null);
      router.refresh();
    }
  }

  async function remove(id: number) {
    const res = await fetch(`/api/settings/loan-terms/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      setDeletingId(null);
      setDeleteConfirmText("");
      router.refresh();
    }
  }

  return (
    <section className="panel p-4">
      <h2 className="font-semibold">Desired Terms</h2>
      <p className="mt-1 text-sm text-slate-500">Month values available in the Desired Terms dropdown when encoding applications.</p>
      <div className="mt-4 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="py-2">
            {deletingId === item.id ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md bg-red-50 p-2">
                <span className="text-sm text-red-700">Type DELETE to remove &ldquo;{item.months} months&rdquo;:</span>
                <input
                  className="input w-32"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                />
                <button
                  type="button"
                  className="btn bg-red-600 text-white hover:bg-red-700"
                  disabled={deleteConfirmText !== "DELETE"}
                  onClick={() => remove(item.id)}
                >
                  Confirm delete
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setDeletingId(null);
                    setDeleteConfirmText("");
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                {editingId === item.id ? (
                  <input className="input" type="number" min="1" value={editingMonths} onChange={(e) => setEditingMonths(e.target.value)} autoFocus />
                ) : (
                  <span className="text-sm">{item.months} months</span>
                )}
                {canManage ? (
                  <div className="flex shrink-0 gap-2">
                    {editingId === item.id ? (
                      <>
                        <button type="button" className="btn-secondary" onClick={() => save(item.id)} aria-label="Save">
                          <Check size={15} />
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => setEditingId(null)} aria-label="Cancel">
                          <X size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingMonths(String(item.months));
                          }}
                          aria-label="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setDeletingId(item.id);
                            setDeleteConfirmText("");
                          }}
                          aria-label="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
        {!items.length ? <div className="py-2 text-sm text-slate-500">No term options yet.</div> : null}
      </div>
      {canManage ? (
        <form onSubmit={add} className="mt-4 flex gap-2">
          <input className="input" type="number" min="1" placeholder="Months (e.g. 12)" value={months} onChange={(e) => setMonths(e.target.value)} />
          <button className="btn-primary shrink-0" disabled={saving}>
            <Plus size={16} />
            Add
          </button>
        </form>
      ) : null}
    </section>
  );
}
