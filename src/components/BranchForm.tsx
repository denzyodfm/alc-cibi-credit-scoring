"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

export function BranchForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form))
    });
    event.currentTarget.reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Add branch
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="panel grid gap-3 p-4 md:grid-cols-4">
      <input className="input" name="branchCode" placeholder="Branch code" required />
      <input className="input" name="branchName" placeholder="Branch name" required />
      <input className="input" name="branchAddress" placeholder="Address" />
      <label className="flex items-center gap-2 text-sm">
        <input name="isHeadOffice" type="checkbox" value="true" />
        Head Office
      </label>
      <button className="btn-primary md:col-span-1">Save branch</button>
      <button className="btn-secondary md:col-span-1" type="button" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}
