"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Officer = { id: number; fullName: string; branchCode: string; branchName: string };
type CurrentUser = { id: number; fullName: string; role: string; branchCode: string; branchName: string };

export function LoanCreateForm({
  officers,
  loanProducts,
  currentUser
}: {
  officers: Officer[];
  loanProducts: string[];
  currentUser: CurrentUser;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAccountOfficer = currentUser.role === "ACCOUNT_OFFICER";
  const [selectedOfficerId, setSelectedOfficerId] = useState(() => (isAccountOfficer ? String(currentUser.id) : String(officers[0]?.id ?? "")));
  const [ciDate, setCiDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  });

  const selectedOfficerBranch = useMemo(() => {
    if (isAccountOfficer) return `${currentUser.branchCode} / ${currentUser.branchName}`;
    const officer = officers.find((o) => String(o.id) === selectedOfficerId);
    return officer ? `${officer.branchCode} / ${officer.branchName}` : "-";
  }, [isAccountOfficer, officers, selectedOfficerId, currentUser]);

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
      <select className="input" name="loanProduct" required defaultValue="">
        <option value="" disabled>Loan product</option>
        {loanProducts.map((product) => (
          <option key={product} value={product}>{product}</option>
        ))}
      </select>
      <input className="input" name="amountApplied" type="number" min="0" step="0.01" placeholder="Amount applied" required />
      <label>
        <span className="label">CI date</span>
        <input className="input mt-1" name="ciDate" type="date" value={ciDate} onChange={(event) => setCiDate(event.target.value)} required />
      </label>
      {isAccountOfficer ? (
        <>
          <input type="hidden" name="loanOfficerId" value={currentUser.id} />
          <div className="input flex items-center bg-slate-50 text-slate-600">{currentUser.fullName} (You)</div>
        </>
      ) : (
        <select className="input" name="loanOfficerId" required value={selectedOfficerId} onChange={(e) => setSelectedOfficerId(e.target.value)}>
          {officers.map((officer) => (
            <option key={officer.id} value={officer.id}>{officer.fullName}</option>
          ))}
        </select>
      )}
      <div className="text-xs text-slate-500 md:col-span-4">Branch: <span className="font-medium text-slate-700">{selectedOfficerBranch}</span></div>
      <input className="input md:col-span-4" name="loanPurpose" placeholder="Loan purpose" />
      <button className="btn-primary">Create and encode CI/BI</button>
    </form>
  );
}
