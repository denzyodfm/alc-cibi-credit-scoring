"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export function CommitteeSettingsManager({ branches, users, roles, tiers, canManage }: {
  branches: any[]; users: any[]; roles: readonly (readonly [string, string])[]; tiers: readonly any[]; canManage: boolean;
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(branches[0]?.id || 0);
  const [busy, setBusy] = useState("");
  const branch = branches.find((item) => item.id === branchId);

  async function save(roleKey: string, userId: string) {
    setBusy(roleKey);
    const response = await fetch("/api/settings/committee-assignments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branchId, roleKey, userId }) });
    setBusy("");
    if (!response.ok) { const body = await response.json().catch(() => ({})); return alert(body.error || "Could not save assignment."); }
    router.refresh();
  }

  return <div className="space-y-5">
    <div className="panel p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-black text-blue-950">Credit Committee Configuration</h2><p className="mt-1 text-sm text-slate-500">Assign this app&apos;s active users to committee roles for each branch.</p></div><select className="input w-full sm:w-72" value={branchId} onChange={(e) => setBranchId(Number(e.target.value))}>{branches.map((item) => <option key={item.id} value={item.id}>{item.branchCode} · {item.branchName}</option>)}</select></div></div>
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <div className="panel p-5"><div className="mb-4 flex items-center gap-2"><ShieldCheck className="text-blue-600"/><h3 className="font-black text-blue-950">{branch?.branchName} assignments</h3></div><div className="grid gap-3 md:grid-cols-2">{roles.map(([key, label]) => { const current = branch?.committeeAssignments.find((item:any) => item.roleKey === key); return <label key={key} className="rounded-lg border bg-slate-50 p-3"><span className="label">{label}</span><select className="input mt-1" value={current?.userId || ""} disabled={!canManage || busy === key} onChange={(e) => void save(key, e.target.value)}><option value="" disabled>Assign an active user</option>{users.map((person) => <option key={person.id} value={person.id}>#{person.id} · {person.fullName} · {person.branchCode}</option>)}</select></label>; })}</div></div>
      <div className="space-y-3">{tiers.map((tier) => <section className="panel p-4" key={tier.key}><h3 className="font-black text-blue-950">{tier.label}</h3><div className="mt-3 space-y-2">{tier.roles.map((roleKey:string, index:number) => { const assignment = branch?.committeeAssignments.find((item:any) => item.roleKey === roleKey); const label = roles.find(([key]) => key === roleKey)?.[1]; return <div className="flex items-center gap-2 text-sm" key={roleKey}><span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black ${assignment ? "bg-blue-600 text-white" : "bg-slate-200"}`}>{index + 1}</span><span className="min-w-0 flex-1"><strong>{label}</strong><br/><span className="text-xs text-slate-500">{assignment ? `#${assignment.user.id} · ${assignment.user.fullName}` : "Not assigned"}</span></span>{assignment ? <CheckCircle2 className="text-emerald-600" size={18}/> : null}</div>; })}</div></section>)}</div>
    </div>
  </div>;
}
