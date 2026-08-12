"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3, ExternalLink, Search, X } from "lucide-react";
import { CommitteeReviewForm } from "@/components/CommitteeReviewForm";

export function ApprovalDashboard({ loans, approvers, canAssign, currentUserId }: { loans: any[]; approvers: any[]; canAssign: boolean; currentUserId: number }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const filtered = useMemo(() => loans.filter((loan) => `${loan.applicationNo} ${loan.applicantProfile?.fullName} ${loan.branch?.branchName}`.toLowerCase().includes(query.toLowerCase())), [loans, query]);

  async function assign(reviewId: number, reviewerId: string) {
    setBusy(reviewId);
    const response = await fetch(`/api/committee-reviews/${reviewId}/assign`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewerId }) });
    const body = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) return alert(body.error || "Could not change approver.");
    router.refresh();
  }

  return <>
    <div className="panel mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
      <div><div className="text-2xl font-black text-blue-950">Loan Approval Dashboard</div><div className="text-sm text-slate-500">Live committee queue and sequential approval progress</div></div>
      <label className="relative w-full sm:w-80"><Search className="absolute left-3 top-2.5 text-blue-600" size={18}/><input className="input pl-10" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search borrower, application or branch"/></label>
    </div>
    <div className="space-y-4">{filtered.map((loan) => {
      const completed = loan.committeeReviews.filter((review:any)=>review.decision === "APPROVED").length;
      return <article key={loan.id} className="panel overflow-hidden border-l-4 border-l-blue-600">
        <div className="grid gap-4 p-4 xl:grid-cols-[92px_1fr_2fr]">
          <button onClick={()=>setPreview(loan)} className="group relative h-24 w-24 overflow-hidden rounded-xl border-2 border-blue-100 bg-blue-50" title="Open complete loan record">
            {loan.applicantProfile?.photoDataUrl ? <img src={loan.applicantProfile.photoDataUrl} alt="" className="h-full w-full object-cover"/> : <span className="grid h-full place-items-center text-xs font-bold text-blue-700">OPEN RECORD</span>}
            <span className="absolute inset-0 grid place-items-center bg-blue-950/0 text-white opacity-0 transition group-hover:bg-blue-950/60 group-hover:opacity-100"><ExternalLink/></span>
          </button>
          <div><button onClick={()=>setPreview(loan)} className="text-left text-lg font-black text-blue-950 hover:text-blue-700">{loan.applicantProfile?.fullName || "Incomplete profile"}</button><div className="text-sm font-semibold text-blue-600">{loan.applicationNo}</div><div className="mt-2 text-sm text-slate-600">{loan.branch.branchName} · {loan.loanProduct}</div><div className="mt-1 text-sm">Applied <strong>₱{Number(loan.amountApplied).toLocaleString("en-PH")}</strong> · {loan.desiredTerms || "No term"}</div></div>
          <div><div className="mb-3 flex items-center justify-between"><strong className="text-sm text-slate-700">Committee progress</strong><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">{completed}/{loan.committeeReviews.length} complete</span></div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{loan.committeeReviews.map((review:any, index:number) => { const done=review.decision === "APPROVED"; return <div key={review.id} className={`rounded-lg border p-3 ${done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase text-slate-500">Stage {index+1}</span><span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-black ${done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>{done ? <Check size={15}/> : 0}</span></div><select className="input mt-2 h-9 py-1 text-xs font-bold" value={review.reviewerId} disabled={!canAssign || done || busy===review.id} onChange={(e)=>void assign(review.id,e.target.value)}>{approvers.map((person)=><option value={person.id} key={person.id}>#{person.id} · {person.fullName}</option>)}</select><div className="mt-2 flex items-center gap-1 text-xs text-slate-500">{done ? <Check size={13}/> : <Clock3 size={13}/>} {review.decision.replaceAll("_"," ")}{review.reviewedAt ? ` · ${new Date(review.reviewedAt).toLocaleString()}` : ""}</div></div>})}</div>
          </div>
        </div>
        {loan.committeeReviews.filter((r:any)=>r.reviewerId===currentUserId && r.decision==="PENDING").map((review:any)=><div className="border-t bg-slate-50 p-4" key={review.id}><CommitteeReviewForm reviewId={review.id} currentDecision={review.decision} review={review}/></div>)}
      </article>})}{!filtered.length && <div className="panel p-8 text-center text-slate-500">No committee loans match this view.</div>}</div>
    {preview && <div className="fixed inset-0 z-50 bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"><div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-5 py-3"><div><strong>{preview.applicantProfile?.fullName}</strong><span className="ml-2 text-sm text-slate-500">{preview.applicationNo}</span></div><button className="btn-secondary px-3" onClick={()=>setPreview(null)}><X size={18}/> Close</button></div><iframe className="min-h-0 flex-1 bg-slate-50" src={`/loans/${preview.id}`} title={`Loan record ${preview.applicationNo}`}/></div></div>}
  </>;
}
