import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  appraisedCollateralValue,
  deriveDti,
  deriveLtv,
  deriveScores,
  grossMonthlyIncome,
  monthlyObligations,
  DTI_CODE,
  LTV_CODE
} from "../src/lib/credit-metrics";

describe("grossMonthlyIncome", () => {
  it("prefers the cash flow tab when it has income rows", () => {
    const income = grossMonthlyIncome({
      incomeProfile: { grossMonthlySalary: 20000 },
      cashFlows: [
        { entryType: "Income", income: 25000 },
        { entryType: "Income", income: 4330 },
        { entryType: "Expense", income: 0 }
      ]
    });
    assert.equal(income, 29330);
  });

  it("falls back to the declared income profile when cash flow is empty", () => {
    const income = grossMonthlyIncome({
      incomeProfile: { grossMonthlySalary: 20000, pensionMonthlyAmount: 5000, averageMonthlyGrossRevenue: 1000 },
      cashFlows: []
    });
    assert.equal(income, 26000);
  });

  it("returns zero when nothing has been captured", () => {
    assert.equal(grossMonthlyIncome({}), 0);
  });

  it("ignores unparseable values rather than producing NaN", () => {
    const income = grossMonthlyIncome({ incomeProfile: { grossMonthlySalary: "not a number" }, cashFlows: [] });
    assert.equal(income, 0);
  });
});

describe("monthlyObligations", () => {
  it("sums every liability row", () => {
    assert.equal(monthlyObligations({ liabilities: [{ monthlyObligation: 1200 }, { monthlyObligation: 800 }] }), 2000);
  });

  it("treats missing obligations as zero", () => {
    assert.equal(monthlyObligations({ liabilities: [{ monthlyObligation: null }, {}] }), 0);
  });
});

describe("appraisedCollateralValue", () => {
  it("includes attached properties alongside the collateral itself", () => {
    const value = appraisedCollateralValue({
      collateral: [{ appraisedValue: 900000 }],
      attachedProperties: [{ appraisedValue: 150000 }]
    });
    assert.equal(value, 1050000);
  });
});

describe("deriveDti", () => {
  const base = { incomeProfile: { grossMonthlySalary: 20000 }, cashFlows: [] };

  it("scores 4 at or below 50 percent", () => {
    const result = deriveDti({ ...base, liabilities: [{ monthlyObligation: 5000 }], proposedAmortization: 5000 });
    assert.equal(result.ratio, 50);
    assert.equal(result.score, 4);
  });

  it("walks down the bands as the ratio climbs", () => {
    const bands: [number, number][] = [
      [11000, 3], // 55%
      [13000, 2], // 65%
      [15000, 1], // 75%
      [18000, 0] // 90%
    ];
    for (const [amortization, expected] of bands) {
      const result = deriveDti({ ...base, liabilities: [], proposedAmortization: amortization });
      assert.equal(result.score, expected, `amortization ${amortization} should score ${expected}`);
    }
  });

  it("counts existing obligations as well as the proposed amortization", () => {
    const result = deriveDti({ ...base, liabilities: [{ monthlyObligation: 6000 }], proposedAmortization: 6000 });
    assert.equal(result.ratio, 60);
    assert.equal(result.score, 3);
  });

  it("cannot be computed without income and says so", () => {
    const result = deriveDti({ incomeProfile: {}, cashFlows: [], proposedAmortization: 5000 });
    assert.equal(result.score, null);
    assert.equal(result.ratio, null);
    assert.equal(result.excluded, false);
    assert.match(result.detail, /gross monthly income/i);
  });

  it("is never excluded — the form treats DTI as always computable", () => {
    assert.equal(deriveDti({ ...base, proposedAmortization: 1000 }).excluded, false);
  });
});

describe("deriveLtv", () => {
  it("scores 4 at or below 60 percent", () => {
    const result = deriveLtv({ amountApplied: 600000, collateral: [{ appraisedValue: 1000000 }] });
    assert.equal(result.ratio, 60);
    assert.equal(result.score, 4);
  });

  it("walks down the bands as the ratio climbs", () => {
    const bands: [number, number][] = [
      [700000, 3],
      [800000, 2],
      [900000, 1],
      [950000, 0]
    ];
    for (const [amount, expected] of bands) {
      const result = deriveLtv({ amountApplied: amount, collateral: [{ appraisedValue: 1000000 }] });
      assert.equal(result.score, expected, `amount ${amount} should score ${expected}`);
    }
  });

  it("excludes and renormalises when no collateral is offered, rather than scoring zero", () => {
    const result = deriveLtv({ amountApplied: 250000, collateral: [] });
    assert.equal(result.excluded, true);
    assert.equal(result.score, null);
    assert.match(result.detail, /no collateral/i);
  });

  it("waits for the loan amount instead of excluding", () => {
    const result = deriveLtv({ amountApplied: 0, collateral: [{ appraisedValue: 500000 }] });
    assert.equal(result.excluded, false);
    assert.equal(result.score, null);
  });
});

describe("deriveScores", () => {
  it("returns exactly the two formula-driven criteria", () => {
    const scores = deriveScores({ amountApplied: 100000, collateral: [{ appraisedValue: 500000 }] });
    assert.deepEqual(Object.keys(scores).sort(), [DTI_CODE, LTV_CODE].sort());
  });
});
