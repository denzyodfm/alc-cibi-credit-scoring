"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

const roles = [
  "SUPER_ADMIN",
  "HEAD_OFFICE_ADMIN",
  "HEAD_OFFICE_CREDIT_COMMITTEE",
  "AREA_TEAM_LEADER",
  "BRANCH_TEAM_LEADER",
  "ACCOUNT_OFFICER",
  "CASHIER",
  "BOOKKEEPER",
  "VIEWER"
];

export function UserForm({ branches }: { branches: { id: number; branchName: string; branchCode: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/users", {
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
        Add user
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="panel grid gap-3 p-4 md:grid-cols-3">
      <input className="input" name="employeeNo" placeholder="Employee no." required />
      <input className="input" name="fullName" placeholder="Full name" required />
      <input className="input" name="email" type="email" placeholder="Email" required />
      <input className="input" name="username" placeholder="Username" required />
      <input className="input" name="password" type="password" placeholder="Temporary password" defaultValue="Password123!" required />
      <select className="input" name="branchId" required>
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branchCode} / {branch.branchName}</option>)}
      </select>
      <select className="input" name="role" required>
        {roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}
      </select>
      <button className="btn-primary">Save user</button>
      <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}
