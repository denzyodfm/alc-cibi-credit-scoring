"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, FileUp, Send, WalletCards } from "lucide-react";

const SECTIONS = ["Borrower Info", "Requirements", "CI/BI", "Cash Flow", "Computation", "Payment History", "Balance View", "Recommendation", "Dashboard"];
const REQUIREMENTS = [
  ["LOAN_APPLICATION", "Loan Application"], ["ID_BILLING", "ID & Billing"], ["CI_BI", "CI/BI Report"], ["COMAKERS", "Co-makers"],
  ["BANK_STATEMENT", "Bank Statement / Pay Slip"], ["GOVERNMENT_VOUCHER", "SSS / GSIS Voucher"], ["EMPLOYMENT", "Certificate of Employment"],
  ["COLLATERAL_DOCS", "OR/CR, Title or Collateral Documents"], ["BARANGAY", "Barangay Clearance / Proof of Billing"]
] as const;

export function LoanProcessingWorkspace({ loan, canReview }: { loan: any; canReview: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState("Dashboard");
  const [saving, setSaving] = useState(false);
  const remarks = useMemo(() => new Map((loan.sectionRemarks ?? []).map((r: any) => [r.sectionKey, r])), [loan.sectionRemarks]);
  const income = (loan.cashFlows ?? []).reduce((sum: number, row: any) => sum + Number(row.income || 0), 0);
  const expense = (loan.cashFlows ?? []).reduce((sum: number, row: any) => sum + Number(row.expense || 0), 0);
  const netIncome = income - expense;
  const requirementMap = new Map((loan.requirements ?? []).map((r: any) => [r.requirementType, r]));
  const completeRequirements = Array.from(requirementMap.values()).filter((r: any) => r.status === "VERIFIED" || r.status === "SUBMITTED").length;

  async function saveRemarks(section: string, form: HTMLFormElement) {
    const data = new FormData(form);
    await fetch(`/api/loans/${loan.id}/processing`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remarks: [{ sectionKey: section, aoRemarks: data.get("aoRemarks"), committeeRemarks: data.get("committeeRemarks") }] }) });
    router.refresh();
  }

  async function uploadRequirement(type: string, label: string, file?: File) {
    if (!file || file.size > 3 * 1024 * 1024) return;
    const dataUrl = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
    await fetch(`/api/loans/${loan.id}/requirements`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requirementType: type, label, status: "SUBMITTED", fileName: file.name, documentMimeType: file.type, documentDataUrl: dataUrl }) });
    router.refresh();
  }

  const remarkBox = (section: string) => {
    const item: any = remarks.get(section);
    return <form className="mt-5 rounded-lg border border-blue-100 bg-blue-50/60 p-4" onSubmit={(e) => { e.preventDefault(); void saveRemarks(section, e.currentTarget); }}>
      <div className="grid gap-3 lg:grid-cols-2">
        <label><span className="label">Account Officer review / remarks</span><textarea className="input mt-1 min-h-24" name="aoRemarks" defaultValue={item?.aoRemarks ?? ""} readOnly={canReview} /></label>
        <label><span className="label">Credit Committee review / remarks</span><textarea className="input mt-1 min-h-24" name="committeeRemarks" defaultValue={item?.committeeRemarks ?? ""} readOnly={!canReview} /></label>
      </div><button className="btn-primary mt-3" disabled={saving}>Save section review</button>
    </form>;
  };

  return <section className="mt-5">
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{SECTIONS.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "btn-primary shrink-0" : "btn-secondary shrink-0"}>{item}</button>)}</div>
    <div className="panel p-5">
      {tab === "Dashboard" && <div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Summary title="Applicant" value={loan.applicantProfile?.fullName || "Incomplete"} />
          <Summary title="Amount Applied" value={`₱${Number(loan.amountApplied).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} />
          <Summary title="Net Monthly Income" value={`₱${netIncome.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} />
          <Summary title="Requirements" value={`${completeRequirements} / ${REQUIREMENTS.length} submitted`} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3"><div className="lg:col-span-2 rounded-lg border p-4"><h3 className="font-bold">Decision snapshot</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2"><Info label="Status" value={loan.status.replaceAll("_", " ")} /><Info label="5C Score" value={loan.scorecard ? `${Number(loan.scorecard.overallScore).toFixed(2)}%` : "Not scored"} /><Info label="Purpose" value={`${loan.loanPurposeCategory || "-"} — ${loan.loanPurpose || "Not specified"}`} /><Info label="Endorsement" value={loan.endorsementCode || "Pending"} /></dl></div><div className="rounded-lg bg-blue-900 p-4 text-white"><div className="text-sm text-blue-200">AO Recommendation</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{loan.aoClientRemarks || "No Account Officer remarks recorded."}</p></div></div>
        {remarkBox("DASHBOARD")}
      </div>}
      {tab === "Borrower Info" && <div><h2 className="text-lg font-bold">Borrower Information</h2><dl className="mt-4 grid gap-3 md:grid-cols-3"><Info label="Name" value={loan.applicantProfile?.fullName} /><Info label="Current Address" value={loan.applicantProfile?.currentAddress} /><Info label="Permanent Address" value={loan.applicantProfile?.permanentAddress} /><Info label="Contact" value={loan.applicantProfile?.contactNumber} /><Info label="Civil Status" value={loan.applicantProfile?.civilStatus} /><Info label="Source of Income" value={loan.incomeProfile?.employmentStatus} /></dl>{remarkBox("BORROWER_INFO")}</div>}
      {tab === "Requirements" && <div><h2 className="text-lg font-bold">Loan Requirements</h2><p className="mt-1 text-sm text-slate-500">Upload PDF or image files up to 3 MB each.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{REQUIREMENTS.map(([type,label]) => { const saved:any=requirementMap.get(type); return <label key={type} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><strong className="text-sm">{label}</strong>{saved ? <CheckCircle2 className="text-green-600" /> : <Clock3 className="text-amber-500" />}</div><div className="mt-1 truncate text-xs text-slate-500">{saved?.fileName || "Not uploaded"}</div><span className="btn-secondary mt-3 w-full cursor-pointer"><FileUp /> Upload<input className="hidden" type="file" accept="image/*,.pdf" onChange={(e)=>void uploadRequirement(type,label,e.target.files?.[0])}/></span></label>})}</div>{remarkBox("REQUIREMENTS")}</div>}
      {tab === "CI/BI" && <div><h2 className="text-lg font-bold">CI/BI Summary</h2><dl className="mt-4 grid gap-3 md:grid-cols-3"><Info label="CI Form" value={loan.ciFormNo} /><Info label="CI Date" value={loan.dateOfCi?.slice?.(0,10)} /><Info label="Score" value={loan.scorecard ? `${Number(loan.scorecard.overallScore).toFixed(2)}%` : "-"} /><Info label="Residence" value={loan.applicantProfile?.residenceType} /><Info label="Business / Employer" value={loan.incomeProfile?.businessName || loan.incomeProfile?.employerName} /><Info label="Collateral Items" value={String(loan.collateral?.length ?? 0)} /></dl>{remarkBox("CI_BI")}</div>}
      {tab === "Cash Flow" && <div><h2 className="text-lg font-bold">Cash Flow</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><Summary title="Monthly Income" value={`₱${income.toLocaleString("en-PH",{minimumFractionDigits:2})}`} /><Summary title="Monthly Expenses" value={`₱${expense.toLocaleString("en-PH",{minimumFractionDigits:2})}`} /><Summary title="Net Income" value={`₱${netIncome.toLocaleString("en-PH",{minimumFractionDigits:2})}`} /></div>{remarkBox("CASH_FLOW")}</div>}
      {tab === "Computation" && <Computation loan={loan} remarkBox={remarkBox} router={router} />}
      {(tab === "Payment History" || tab === "Balance View") && <div className="py-10 text-center"><WalletCards className="mx-auto text-blue-600" size={44}/><h2 className="mt-3 text-lg font-bold">{tab}</h2><p className="mt-2 text-sm text-slate-500">Ready for integration with ALC Client Inquiry. No payment data is fabricated in this version.</p>{remarkBox(tab === "Payment History" ? "PAYMENT_HISTORY" : "BALANCE_VIEW")}</div>}
      {tab === "Recommendation" && <div><h2 className="text-lg font-bold">Professional Loan Recommendation</h2><div className="mt-4 rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5"><dl className="grid gap-4 md:grid-cols-2"><Info label="Referring Account Officer" value={loan.loanOfficer?.fullName} /><Info label="Subject Account" value={loan.applicantProfile?.fullName} /><Info label="Amount Applied" value={`₱${Number(loan.amountApplied).toLocaleString("en-PH")}`} /><Info label="Recommended Amount" value={loan.computation?.recommendedAmount ? `₱${Number(loan.computation.recommendedAmount).toLocaleString("en-PH")}` : "Pending computation"} /><Info label="Purpose" value={`${loan.loanPurposeCategory || "-"}: ${loan.loanPurpose || "-"}`} /><Info label="Source of Repayment" value={loan.computation?.sourceOfRepayment || loan.incomeProfile?.employmentStatus} /></dl><p className="mt-5 whitespace-pre-wrap border-t pt-4 text-sm leading-6">{loan.aoClientRemarks || "Account Officer recommendation is pending."}</p></div>{remarkBox("RECOMMENDATION")}</div>}
    </div>
    {loan.status === "ENDORSED" && <button type="button" className="btn-primary mt-4" onClick={async()=>{setSaving(true);await fetch(`/api/loans/${loan.id}/route-committee`,{method:"POST"});setSaving(false);router.refresh();}}><Send/>Submit to Credit Committee</button>}
  </section>;
}

function Summary({title,value}:{title:string;value:string}) { return <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase tracking-wide text-blue-600">{title}</div><div className="mt-2 text-xl font-bold text-slate-900">{value}</div></div> }
function Info({label,value}:{label:string;value:any}) { return <div><dt className="label">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value || "-"}</dd></div> }
function Computation({loan,remarkBox,router}:{loan:any;remarkBox:(s:string)=>React.ReactNode;router:any}) { const c=loan.computation||{}; return <div><form onSubmit={async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);await fetch(`/api/loans/${loan.id}/processing`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({computation:Object.fromEntries(f)})});router.refresh();}}><h2 className="text-lg font-bold">Loan Computation</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{[["recommendedAmount","Recommended Amount"],["outstandingBalance","Outstanding / Pay-off Balance"],["interestRate","Interest Rate %"],["serviceFee","Service Fee"],["insurance","Insurance"],["documentaryStamp","Documentary Stamp"],["notarialFee","Notarial Fee"],["otherCharges","Other Charges"],["monthlyAmortization","Monthly Amortization"]].map(([name,label])=><label key={name}><span className="label">{label}</span><input className="input mt-1" name={name} type="number" step="0.01" defaultValue={c[name]??""}/></label>)}<label><span className="label">Source of Repayment</span><input className="input mt-1" name="sourceOfRepayment" defaultValue={c.sourceOfRepayment??""}/></label><label><span className="label">Collection Type</span><input className="input mt-1" name="collectionType" defaultValue={c.collectionType??""}/></label><label><span className="label">Loan Type</span><select className="input mt-1" name="loanType" defaultValue={c.loanType??"Regular Loan"}><option>Regular Loan</option><option>Modified Loan</option></select></label></div><button className="btn-primary mt-4">Save computation</button></form>{remarkBox("COMPUTATION")}</div> }
