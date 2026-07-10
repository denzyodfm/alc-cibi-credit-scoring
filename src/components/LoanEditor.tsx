"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calculator, Printer, Save, Send } from "lucide-react";

type Criterion = {
  category: string;
  code: string;
  name: string;
  questionGuide: string;
  scoreDescriptions: Record<string, string>;
  naTreatment: string;
  autoDqIfZero: boolean;
};

type LoanEditorProps = {
  loan: any;
  criteria: Criterion[];
  settings: { category: string; weightPercent: string | number }[];
};

const tabs = ["Loan", "Applicant", "Household", "Income", "Liabilities", "References", "Assets", "Collateral", "Scorecard", "Recommendation"];

function blankRows<T>(rows: T[] | undefined, fallback: T): T[] {
  return rows?.length ? rows : [fallback];
}

export function LoanEditor({ loan, criteria, settings }: LoanEditorProps) {
  const router = useRouter();
  const [tab, setTab] = useState("Loan");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const existingItems = new Map<string, any>((loan.scorecard?.items ?? []).map((item: any) => [item.subCriterionCode, item]));
  const [scoreItems, setScoreItems] = useState(() =>
    criteria.map((criterion) => ({
      code: criterion.code,
      score: existingItems.get(criterion.code)?.score ?? 2,
      isNa: existingItems.get(criterion.code)?.isNa ?? false,
      remarks: existingItems.get(criterion.code)?.remarks ?? ""
    }))
  );
  const weightByCategory = new Map(settings.map((item) => [item.category, Number(item.weightPercent)]));

  const preview = useMemo(() => {
    const itemByCode = new Map(scoreItems.map((item) => [item.code, item]));
    const rows = criteria.map((criterion) => {
      const item = itemByCode.get(criterion.code)!;
      let score = Number(item.score);
      let included = true;
      if (item.isNa && criterion.naTreatment !== "NEVER_NA") {
        if (criterion.naTreatment === "EXCLUDE_RENORMALIZE") {
          included = false;
          score = 0;
        } else if (criterion.naTreatment.includes("1")) score = 1;
        else if (criterion.naTreatment.includes("4")) score = 4;
        else score = 2;
      }
      return { ...criterion, score, included };
    });
    const categoryScores: Record<string, number> = {};
    for (const category of weightByCategory.keys()) {
      const included = rows.filter((row) => row.category === category && row.included);
      const actual = included.reduce((sum, row) => sum + row.score, 0);
      categoryScores[category] = included.length ? (actual / (included.length * 4)) * (weightByCategory.get(category) ?? 0) : 0;
    }
    const autoDq = rows.filter((row) => row.autoDqIfZero && row.included && row.score === 0);
    const overall = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
    const result = autoDq.length ? "AUTO_DENIED" : overall >= 80 ? "PROCEED" : overall >= 65 ? "FOR_CREDIT_COMMITTEE" : "DENIED";
    return { categoryScores, overall, result, autoDq };
  }, [criteria, scoreItems, settings]);

  async function saveForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      loan: {
        ciFormNo: form.get("ciFormNo"),
        loanProduct: form.get("loanProduct"),
        loanPurpose: form.get("loanPurpose"),
        amountApplied: form.get("amountApplied"),
        desiredTerms: form.get("desiredTerms"),
        proposedAmortization: form.get("proposedAmortization")
      },
      applicant: Object.fromEntries(["fullName", "nickname", "age", "sex", "civilStatus", "currentAddress", "yearsAtAddress", "contactNumber", "email", "gcashNumber", "facebook", "tinNo", "sssId", "philhealthNo", "pagibigNo", "driversLicense"].map((key) => [key, form.get(key)])),
      household: Object.fromEntries(["spousePartnerName", "spouseOccupationEmployer", "spouseMonthlyIncome", "numberOfDependents", "dependentsUnder18", "fatherName", "motherName", "parentAddress"].map((key) => [key, form.get(key)])),
      income: Object.fromEntries(["employmentStatus", "employerName", "positionDesignation", "employmentType", "companyAddress", "lengthOfService", "grossMonthlySalary", "netMonthlyTakeHomePay", "pensionType", "pensionMonthlyAmount", "businessName", "businessAddress", "averageMonthlyGrossRevenue", "averageMonthlyNetIncome", "industry"].map((key) => [key, form.get(key)])),
      liabilities: collectRows(form, "liability", ["creditor", "purpose", "originalAmount", "outstandingBalance", "monthlyObligation", "loanStatus"]),
      references: collectRows(form, "reference", ["referenceName", "relationship", "contactNo", "keyFeedback"]),
      assets: collectRows(form, "asset", ["assetType", "description", "conditionStatus", "estimatedValue", "ownedBy"]),
      collateral: collectRows(form, "collateral", ["collateralType", "registeredOwner", "titleNo", "appraisedValue", "location", "notes"])
    };
    const res = await fetch(`/api/loans/${loan.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    setMessage(res.ok ? "CI/BI details saved." : "Unable to save details.");
    router.refresh();
  }

  async function saveScorecard() {
    setSaving(true);
    const res = await fetch(`/api/loans/${loan.id}/scorecard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: scoreItems })
    });
    setSaving(false);
    setMessage(res.ok ? "Scorecard saved and recommendation recomputed." : "Unable to save scorecard.");
    router.refresh();
  }

  return (
    <form onSubmit={saveForm}>
      <div className="no-print mb-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "btn-primary" : "btn-secondary"}>{item}</button>
        ))}
      </div>
      {message ? <div className="mb-4 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</div> : null}
      <section className="panel p-4">
        {tab === "Loan" ? (
          <Grid>
            <Field name="ciFormNo" label="CI form no." defaultValue={loan.ciFormNo} />
            <Field name="loanProduct" label="Loan product" defaultValue={loan.loanProduct} />
            <Field name="amountApplied" label="Amount applied" type="number" defaultValue={loan.amountApplied} />
            <Field name="desiredTerms" label="Desired terms" defaultValue={loan.desiredTerms} />
            <Field name="proposedAmortization" label="Proposed amortization" type="number" defaultValue={loan.proposedAmortization} />
            <TextArea name="loanPurpose" label="Loan purpose" defaultValue={loan.loanPurpose} />
          </Grid>
        ) : null}
        {tab === "Applicant" ? (
          <Grid>
            {["fullName", "nickname", "age", "sex", "civilStatus", "currentAddress", "yearsAtAddress", "contactNumber", "email", "gcashNumber", "facebook", "tinNo", "sssId", "philhealthNo", "pagibigNo", "driversLicense"].map((key) => (
              <Field key={key} name={key} label={labelize(key)} defaultValue={loan.applicantProfile?.[key]} />
            ))}
          </Grid>
        ) : null}
        {tab === "Household" ? (
          <Grid>
            {["spousePartnerName", "spouseOccupationEmployer", "spouseMonthlyIncome", "numberOfDependents", "dependentsUnder18", "fatherName", "motherName", "parentAddress"].map((key) => (
              <Field key={key} name={key} label={labelize(key)} defaultValue={loan.householdBackground?.[key]} />
            ))}
          </Grid>
        ) : null}
        {tab === "Income" ? (
          <Grid>
            {["employmentStatus", "employerName", "positionDesignation", "employmentType", "companyAddress", "lengthOfService", "grossMonthlySalary", "netMonthlyTakeHomePay", "pensionType", "pensionMonthlyAmount", "businessName", "businessAddress", "averageMonthlyGrossRevenue", "averageMonthlyNetIncome", "industry"].map((key) => (
              <Field key={key} name={key} label={labelize(key)} defaultValue={loan.incomeProfile?.[key]} />
            ))}
          </Grid>
        ) : null}
        {tab === "Liabilities" ? <Rows prefix="liability" rows={blankRows(loan.liabilities, { creditor: "", purpose: "", originalAmount: "", outstandingBalance: "", monthlyObligation: "", loanStatus: "" })} fields={["creditor", "purpose", "originalAmount", "outstandingBalance", "monthlyObligation", "loanStatus"]} /> : null}
        {tab === "References" ? <Rows prefix="reference" rows={blankRows(loan.references, { referenceName: "", relationship: "", contactNo: "", keyFeedback: "" })} fields={["referenceName", "relationship", "contactNo", "keyFeedback"]} /> : null}
        {tab === "Assets" ? <Rows prefix="asset" rows={blankRows(loan.assets, { assetType: "", description: "", conditionStatus: "", estimatedValue: "", ownedBy: "" })} fields={["assetType", "description", "conditionStatus", "estimatedValue", "ownedBy"]} /> : null}
        {tab === "Collateral" ? <Rows prefix="collateral" rows={blankRows(loan.collateral, { collateralType: "", registeredOwner: "", titleNo: "", appraisedValue: "", location: "", notes: "" })} fields={["collateralType", "registeredOwner", "titleNo", "appraisedValue", "location", "notes"]} /> : null}
        {tab === "Scorecard" ? (
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {["Character", "Capacity", "Capital", "Collateral", "Conditions"].map((category) => (
                <div key={category} className="rounded-md border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold">{category}</div>
                  <div className="divide-y divide-slate-100">
                    {criteria.filter((c) => c.category === category).map((criterion) => {
                      const index = scoreItems.findIndex((item) => item.code === criterion.code);
                      const item = scoreItems[index];
                      return (
                        <div key={criterion.code} className="p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="font-semibold">{criterion.code}. {criterion.name}</div>
                              <p className="mt-1 text-sm text-slate-600">{criterion.questionGuide}</p>
                              {criterion.autoDqIfZero ? <div className="mt-2 text-xs font-semibold text-red-700">Auto-DQ when scored 0</div> : null}
                            </div>
                            <select className="input w-28" value={item.score} onChange={(e) => replaceScore(index, { score: Number(e.target.value) })}>
                              {[4, 3, 2, 1, 0].map((score) => <option key={score} value={score}>{score}</option>)}
                            </select>
                          </div>
                          <div className="mt-2 text-xs text-slate-500">{criterion.scoreDescriptions[String(item.score)]}</div>
                          <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr]">
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={item.isNa} disabled={criterion.naTreatment === "NEVER_NA"} onChange={(e) => replaceScore(index, { isNa: e.target.checked })} />
                              N/A ({criterion.naTreatment.replaceAll("_", " ")})
                            </label>
                            <input className="input" placeholder="Remarks" value={item.remarks} onChange={(e) => replaceScore(index, { remarks: e.target.value })} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <ScorePreview preview={preview} onSave={saveScorecard} saving={saving} />
          </div>
        ) : null}
        {tab === "Recommendation" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">Current recommendation</div>
              <div className="mt-2 text-3xl font-bold">{loan.scorecard?.result ?? "Not scored"}</div>
              <div className="mt-2 text-sm text-slate-600">Overall score: {loan.scorecard ? `${Number(loan.scorecard.overallScore).toFixed(2)}%` : "-"}</div>
              {loan.scorecard?.autoDqReason ? <pre className="mt-3 whitespace-pre-wrap rounded-md bg-red-50 p-3 text-sm text-red-700">{loan.scorecard.autoDqReason}</pre> : null}
            </div>
            <div>
              <div className="text-sm font-semibold">Committee routing/history</div>
              <div className="mt-2 space-y-2">
                {loan.committeeReviews?.length ? loan.committeeReviews.map((review: any) => (
                  <div key={review.id} className="rounded-md bg-slate-50 p-3 text-sm">
                    <div className="font-medium">{review.creditCommittee.committeeName}</div>
                    <div>{review.reviewer.fullName}: {review.decision.replaceAll("_", " ")}</div>
                    {review.remarks ? <div className="text-slate-500">{review.remarks}</div> : null}
                  </div>
                )) : <div className="text-sm text-slate-500">No committee route yet.</div>}
              </div>
            </div>
          </div>
        ) : null}
      </section>
      <div className="no-print mt-4 flex flex-wrap gap-2">
        <button className="btn-primary" disabled={saving} type="submit"><Save size={16} /> Save CI/BI details</button>
        <button className="btn-secondary" disabled={saving} type="button" onClick={saveScorecard}><Calculator size={16} /> Save scorecard</button>
        <button className="btn-secondary" disabled={saving} type="button" onClick={async () => { await fetch(`/api/loans/${loan.id}/submit`, { method: "POST" }); router.refresh(); }}><Send size={16} /> Route to committee</button>
        <Link className="btn-secondary" href={`/reports/${loan.id}`}><Printer size={16} /> Printable report</Link>
      </div>
    </form>
  );

  function replaceScore(index: number, patch: Partial<{ score: number; isNa: boolean; remarks: string }>) {
    setScoreItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }
}

function ScorePreview({ preview, onSave, saving }: { preview: any; onSave: () => void; saving: boolean }) {
  return (
    <aside className="sticky top-20 h-fit rounded-md border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold">Real-time computation</div>
      <div className="mt-3 space-y-2 text-sm">
        {Object.entries(preview.categoryScores).map(([category, value]) => (
          <div key={category} className="flex justify-between"><span>{category}</span><strong>{Number(value).toFixed(2)}%</strong></div>
        ))}
      </div>
      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="text-sm text-slate-500">Overall score</div>
        <div className="text-3xl font-bold">{preview.overall.toFixed(2)}%</div>
        <div className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold">{preview.result.replaceAll("_", " ")}</div>
      </div>
      {preview.autoDq.length ? <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">Auto-DQ triggered by {preview.autoDq.map((item: any) => item.code).join(", ")}.</div> : null}
      <button type="button" className="btn-primary mt-4 w-full" disabled={saving} onClick={onSave}>Save scorecard</button>
    </aside>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-3">{children}</div>;
}

function Field({ label, name, defaultValue, type = "text" }: { label: string; name: string; defaultValue?: any; type?: string }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="input mt-1" name={name} type={type} defaultValue={defaultValue ?? ""} />
    </label>
  );
}

function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: any }) {
  return (
    <label className="md:col-span-3">
      <span className="label">{label}</span>
      <textarea className="input mt-1 min-h-24" name={name} defaultValue={defaultValue ?? ""} />
    </label>
  );
}

function Rows({ prefix, rows, fields }: { prefix: string; rows: any[]; fields: string[] }) {
  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={index} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-3">
          {fields.map((field) => <Field key={field} name={`${prefix}.${index}.${field}`} label={labelize(field)} defaultValue={row[field]} />)}
        </div>
      ))}
      <div className="text-xs text-slate-500">This first version shows existing rows plus one blank row. Add more rows by saving, then using the database/API expansion pattern for the module.</div>
    </div>
  );
}

function collectRows(form: FormData, prefix: string, fields: string[]) {
  const rows: Record<string, any>[] = [];
  for (let index = 0; index < 10; index++) {
    const row: Record<string, any> = {};
    let hasValue = false;
    for (const field of fields) {
      const value = form.get(`${prefix}.${index}.${field}`);
      row[field] = value;
      if (String(value ?? "").trim()) hasValue = true;
    }
    if (hasValue) rows.push(row);
  }
  return rows;
}

function labelize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
