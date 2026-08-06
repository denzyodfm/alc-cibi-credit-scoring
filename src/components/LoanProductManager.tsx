"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X, Check } from "lucide-react";

type LoanProduct = { id: number; name: string; isActive: boolean };

export function LoanProductManager({ products, canManage }: { products: LoanProduct[]; canManage: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(products);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/settings/loan-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() })
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      setItems((current) => [...current, created]);
      setName("");
      router.refresh();
    }
  }

  async function save(id: number) {
    if (!editingName.trim()) return;
    const res = await fetch(`/api/settings/loan-products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim() })
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      setEditingId(null);
      router.refresh();
    }
  }

  async function remove(id: number) {
    const res = await fetch(`/api/settings/loan-products/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      setDeletingId(null);
      setDeleteConfirmText("");
      router.refresh();
    }
  }

  return (
    <section className="panel p-4">
      <h2 className="font-semibold">Loan Products</h2>
      <p className="mt-1 text-sm text-slate-500">Values available in the Loan Product dropdown when encoding applications.</p>
      <div className="mt-4 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="py-2">
            {deletingId === item.id ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md bg-red-50 p-2">
                <span className="text-sm text-red-700">Type DELETE to remove &ldquo;{item.name}&rdquo;:</span>
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
                  <input className="input" value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus />
                ) : (
                  <span className="text-sm">{item.name}</span>
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
                            setEditingName(item.name);
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
        {!items.length ? <div className="py-2 text-sm text-slate-500">No loan products yet.</div> : null}
      </div>
      {canManage ? (
        <form onSubmit={add} className="mt-4 flex gap-2">
          <input className="input" placeholder="New loan product" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary shrink-0" disabled={saving}>
            <Plus size={16} />
            Add
          </button>
        </form>
      ) : null}
    </section>
  );
}
