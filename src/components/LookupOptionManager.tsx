"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X, Check, GripVertical } from "lucide-react";

type Option = { id: number; label: string; isActive: boolean };

export function LookupOptionManager({
  title,
  description,
  apiBase,
  options,
  canManage,
  placeholder,
  sortable = false
}: {
  title: string;
  description: string;
  apiBase: string;
  options: Option[];
  canManage: boolean;
  placeholder: string;
  sortable?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(options);
  const [label, setLabel] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const orderBeforeDrag = useRef<Option[]>([]);

  function beginDrag(event: DragEvent<HTMLDivElement>, id: number) {
    orderBeforeDrag.current = items;
    setDraggingId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(id));
  }

  function moveDraggedItem(overId: number) {
    if (draggingId === null || draggingId === overId) return;
    setItems((current) => {
      const from = current.findIndex((item) => item.id === draggingId);
      const to = current.findIndex((item) => item.id === overId);
      if (from < 0 || to < 0) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      return reordered;
    });
  }

  async function saveOrder() {
    if (draggingId === null) return;
    setDraggingId(null);
    const responses = await Promise.all(
      items.map((item, sortOrder) =>
        fetch(`${apiBase}/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder })
        })
      )
    );
    if (responses.some((response) => !response.ok)) {
      setItems(orderBeforeDrag.current);
      return;
    }
    router.refresh();
  }

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() })
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      setItems((current) => [...current, created]);
      setLabel("");
      router.refresh();
    }
  }

  async function save(id: number) {
    if (!editingLabel.trim()) return;
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editingLabel.trim() })
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      setEditingId(null);
      router.refresh();
    }
  }

  async function remove(id: number) {
    const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      setDeletingId(null);
      setDeleteConfirmText("");
      router.refresh();
    }
  }

  return (
    <section className="panel p-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4 divide-y divide-slate-100">
        {items.map((item) => (
          <div
            key={item.id}
            className={`py-2 ${draggingId === item.id ? "opacity-50" : ""}`}
            draggable={sortable && canManage && editingId !== item.id && deletingId !== item.id}
            onDragStart={(event) => beginDrag(event, item.id)}
            onDragOver={(event) => {
              if (!sortable || draggingId === null) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              moveDraggedItem(item.id);
            }}
            onDrop={(event) => {
              event.preventDefault();
              void saveOrder();
            }}
            onDragEnd={() => setDraggingId(null)}
          >
            {deletingId === item.id ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md bg-red-50 p-2">
                <span className="text-sm text-red-700">Type DELETE to remove &ldquo;{item.label}&rdquo;:</span>
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
                {sortable && canManage ? (
                  <GripVertical className="shrink-0 cursor-grab text-slate-400" size={18} aria-label={`Drag to reorder ${item.label}`} />
                ) : null}
                {editingId === item.id ? (
                  <input className="input" value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)} autoFocus />
                ) : (
                  <span className="flex-1 text-sm">{item.label}</span>
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
                            setEditingLabel(item.label);
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
        {!items.length ? <div className="py-2 text-sm text-slate-500">No values yet.</div> : null}
      </div>
      {canManage ? (
        <form onSubmit={add} className="mt-4 flex gap-2">
          <input className="input" placeholder={placeholder} value={label} onChange={(e) => setLabel(e.target.value)} />
          <button className="btn-primary shrink-0" disabled={saving}>
            <Plus size={16} />
            Add
          </button>
        </form>
      ) : null}
    </section>
  );
}
