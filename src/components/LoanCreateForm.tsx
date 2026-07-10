"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoanCreateForm({ officers }: { officers: { id: number; fullName: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form))
    });
    const data = await res.json();
    router.push(`/loans/${data.id}`);
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus size={16} />
        New application
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="panel grid gap-3 p-4 md:grid-cols-4">
      <input className="input" name="applicantName" placeholder="Applicant full name" required />
      <input className="input" name="loanProduct" placeholder="Loan product" required />
      <input className="input" name="amountApplied" type="number" min="0" step="0.01" placeholder="Amount applied" required />
      <select className="input" name="loanOfficerId" required>
        {officers.map((officer) => <option key={officer.id} value={officer.id}>{officer.fullName}</option>)}
      </select>
      <input className="input md:col-span-3" name="loanPurpose" placeholder="Loan purpose" />
      <button className="btn-primary">Create and encode CI/BI</button>
    </form>
  );
}
