/**
 * Derived credit ratios shared by the browser preview and the server-side scorecard save.
 *
 * These are pure functions over plain data on purpose: the Scorecard tab shows the surveyor the
 * same number the server will store, so the preview can never disagree with the saved result.
 *
 * The scorecard form defines both ratios as formulas rather than judgement calls:
 *   DTI = (existing monthly obligations + proposed amortization) / gross monthly income * 100
 *   LTV = loan amount / appraised collateral value * 100
 */

/** Criterion codes whose scores are derived, not chosen by the surveyor. */
export const DTI_CODE = "2A";
export const LTV_CODE = "4B";

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sum = (values: unknown[]) => values.reduce<number>((total, value) => total + toNumber(value), 0);

export type MetricSource = {
  amountApplied?: unknown;
  proposedAmortization?: unknown;
  incomeProfile?: Record<string, unknown> | null;
  cashFlows?: { entryType?: string | null; income?: unknown }[] | null;
  liabilities?: { monthlyObligation?: unknown }[] | null;
  collateral?: { appraisedValue?: unknown }[] | null;
  attachedProperties?: { appraisedValue?: unknown }[] | null;
};

/**
 * Gross monthly income. The Cash Flow tab is preferred when the officer has filled it in, because
 * its rows are already normalised to monthly equivalents and cover sidelines the income profile
 * has no column for. Otherwise the declared monthly figures across the income sections are summed.
 */
export function grossMonthlyIncome(loan: MetricSource) {
  const cashFlowIncome = sum((loan.cashFlows ?? []).filter((row) => row.entryType === "Income").map((row) => row.income));
  if (cashFlowIncome > 0) return cashFlowIncome;

  const income = loan.incomeProfile ?? {};
  return sum([
    income.grossMonthlySalary,
    income.pensionMonthlyAmount,
    income.deceasedMemberMonthlyPension,
    income.monthlySalaryPhp,
    income.averageMonthlyGrossRevenue
  ]);
}

export function monthlyObligations(loan: MetricSource) {
  return sum((loan.liabilities ?? []).map((row) => row.monthlyObligation));
}

export function appraisedCollateralValue(loan: MetricSource) {
  return sum([
    ...(loan.collateral ?? []).map((row) => row.appraisedValue),
    ...(loan.attachedProperties ?? []).map((row) => row.appraisedValue)
  ]);
}

function bandedScore(value: number, bands: [number, number][]) {
  for (const [ceiling, score] of bands) if (value <= ceiling) return score;
  return 0;
}

export type DerivedMetric = {
  /** null when the ratio cannot be computed from the data captured so far. */
  ratio: number | null;
  score: number | null;
  /** True when the criterion should be excluded and the category renormalised. */
  excluded: boolean;
  detail: string;
};

export function deriveDti(loan: MetricSource): DerivedMetric {
  const income = grossMonthlyIncome(loan);
  const obligations = monthlyObligations(loan);
  const amortization = toNumber(loan.proposedAmortization);

  if (income <= 0) {
    return {
      ratio: null,
      score: null,
      excluded: false,
      detail: "Needs gross monthly income — fill in Source of Income or Cash Flow."
    };
  }

  const ratio = ((obligations + amortization) / income) * 100;
  const score = bandedScore(ratio, [
    [50, 4],
    [60, 3],
    [70, 2],
    [80, 1]
  ]);
  return {
    ratio,
    score,
    excluded: false,
    detail: `(${obligations.toLocaleString("en-PH")} obligations + ${amortization.toLocaleString("en-PH")} amortization) ÷ ${income.toLocaleString("en-PH")} income`
  };
}

export function deriveLtv(loan: MetricSource): DerivedMetric {
  const loanAmount = toNumber(loan.amountApplied);
  const appraised = appraisedCollateralValue(loan);

  // The form's N/A rules say an unsecured loan excludes LTV and renormalises the category,
  // rather than scoring it zero — absence of collateral is not the same as bad collateral.
  if (appraised <= 0) {
    return { ratio: null, score: null, excluded: true, detail: "No collateral offered — excluded and renormalised." };
  }
  if (loanAmount <= 0) {
    return { ratio: null, score: null, excluded: false, detail: "Needs the amount applied." };
  }

  const ratio = (loanAmount / appraised) * 100;
  const score = bandedScore(ratio, [
    [60, 4],
    [70, 3],
    [80, 2],
    [90, 1]
  ]);
  return {
    ratio,
    score,
    excluded: false,
    detail: `${loanAmount.toLocaleString("en-PH")} loan ÷ ${appraised.toLocaleString("en-PH")} appraised collateral`
  };
}

export type DerivedScores = Record<string, DerivedMetric>;

export function deriveScores(loan: MetricSource): DerivedScores {
  return { [DTI_CODE]: deriveDti(loan), [LTV_CODE]: deriveLtv(loan) };
}
