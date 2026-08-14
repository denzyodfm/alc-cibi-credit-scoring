import { NaTreatment, Prisma, ScorecardResult } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deriveScores, type DerivedScores, type MetricSource } from "@/lib/credit-metrics";

export type ScorecardInputItem = {
  code: string;
  score: number;
  isNa?: boolean;
  remarks?: string;
};

export type ComputedItem = {
  category: string;
  subCriterionCode: string;
  subCriterionName: string;
  score: number;
  isNa: boolean;
  naTreatment: NaTreatment;
  weightedIncluded: boolean;
  autoDqIfZero: boolean;
  remarks?: string;
};

export type ScoreComputation = {
  itemRows: ComputedItem[];
  categoryScores: Record<string, number>;
  overallScore: number;
  result: ScorecardResult;
  autoDqTriggered: boolean;
  autoDqReason: string | null;
};

function fixedScoreFor(treatment: NaTreatment) {
  if (treatment === "ASSIGN_FIXED_1") return 1;
  if (treatment === "ASSIGN_FIXED_2" || treatment === "ASSIGN_NEUTRAL_2") return 2;
  if (treatment === "ASSIGN_FIXED_4") return 4;
  return null;
}

/**
 * Loads the data the derived ratios need and computes them. Kept beside computeScorecard so a
 * save always recomputes DTI and LTV from what is actually stored, rather than trusting whatever
 * score the browser posted — 2A is an auto-DQ criterion, so it must not be client-controlled.
 */
export async function deriveScoresForLoan(loanApplicationId: number): Promise<DerivedScores> {
  const loan = await prisma.loanApplication.findUnique({
    where: { id: loanApplicationId },
    select: {
      amountApplied: true,
      proposedAmortization: true,
      incomeProfile: true,
      cashFlows: { select: { entryType: true, income: true } },
      liabilities: { select: { monthlyObligation: true } },
      collateral: { select: { appraisedValue: true } },
      attachedProperties: { select: { appraisedValue: true } }
    }
  });
  if (!loan) return {};
  return deriveScores(loan as MetricSource);
}

export async function getScorecardRules() {
  const [criteria, settings] = await Promise.all([
    prisma.scorecardCriterion.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.scorecardSetting.findMany({ where: { isActive: true } })
  ]);
  return { criteria, settings };
}

export async function computeScorecard(inputItems: ScorecardInputItem[], derived: DerivedScores = {}): Promise<ScoreComputation> {
  const { criteria, settings } = await getScorecardRules();
  const weightByCategory = new Map(settings.map((item) => [item.category, Number(item.weightPercent)]));
  const inputByCode = new Map(inputItems.map((item) => [item.code, item]));
  const itemRows: ComputedItem[] = [];
  const autoDqReasons: string[] = [];

  for (const criterion of criteria) {
    const submitted = inputByCode.get(criterion.code);
    const wantsNa = Boolean(submitted?.isNa);
    let score = Math.max(0, Math.min(4, Number(submitted?.score ?? 2)));
    let weightedIncluded = true;
    let isNa = false;

    // Formula-driven criteria ignore whatever the client posted. A derived score that cannot be
    // computed yet falls back to the submitted value so a half-filled form still saves.
    const derivedMetric = derived[criterion.code];
    if (derivedMetric) {
      if (derivedMetric.excluded) {
        itemRows.push({
          category: criterion.category,
          subCriterionCode: criterion.code,
          subCriterionName: criterion.name,
          score: 0,
          isNa: true,
          naTreatment: criterion.naTreatment,
          weightedIncluded: false,
          autoDqIfZero: criterion.autoDqIfZero,
          remarks: submitted?.remarks
        });
        continue;
      }
      if (derivedMetric.score !== null) score = derivedMetric.score;
    }

    if (wantsNa && criterion.naTreatment !== "NEVER_NA" && !derivedMetric) {
      isNa = true;
      const fixed = fixedScoreFor(criterion.naTreatment);
      if (fixed === null || criterion.naTreatment === "EXCLUDE_RENORMALIZE") {
        weightedIncluded = false;
        score = 0;
      } else {
        score = fixed;
      }
    }

    if (criterion.autoDqIfZero && score === 0 && weightedIncluded) {
      autoDqReasons.push(`${criterion.code} ${criterion.name} scored 0: ${(criterion.scoreDescriptions as Record<string, string>)["0"]}`);
    }

    itemRows.push({
      category: criterion.category,
      subCriterionCode: criterion.code,
      subCriterionName: criterion.name,
      score,
      isNa,
      naTreatment: criterion.naTreatment,
      weightedIncluded,
      autoDqIfZero: criterion.autoDqIfZero,
      remarks: submitted?.remarks
    });
  }

  const categoryScores: Record<string, number> = {};
  for (const category of weightByCategory.keys()) {
    const included = itemRows.filter((item) => item.category === category && item.weightedIncluded);
    const max = included.length * 4;
    const actual = included.reduce((sum, item) => sum + item.score, 0);
    const normalized = max > 0 ? actual / max : 0;
    categoryScores[category] = Number((normalized * (weightByCategory.get(category) ?? 0)).toFixed(2));
  }

  const overallScore = Number(Object.values(categoryScores).reduce((sum, value) => sum + value, 0).toFixed(2));
  const autoDqTriggered = autoDqReasons.length > 0;
  let result: ScorecardResult = "DENIED";
  if (autoDqTriggered) result = "AUTO_DENIED";
  else if (overallScore >= 80) result = "PROCEED";
  else if (overallScore >= 65) result = "FOR_ENDORSEMENT";

  return {
    itemRows,
    categoryScores,
    overallScore,
    result,
    autoDqTriggered,
    autoDqReason: autoDqReasons.length ? autoDqReasons.join("\n") : null
  };
}

export async function routeToCreditCommittee(loanApplicationId: number, actorId: number) {
  const loan = await prisma.loanApplication.findUniqueOrThrow({
    where: { id: loanApplicationId },
    include: { branch: true }
  });
  const amount = Number(loan.amountApplied);
  const { committeeRoleLabel, tierForAmount } = await import("@/lib/committee-config");
  const tier = tierForAmount(amount);
  if (!tier) return null;
  const assignments = await prisma.branchCommitteeAssignment.findMany({ where: { branchId: loan.branchId, roleKey: { in: [...tier.roles] } } });
  const byRole = new Map(assignments.map((item) => [item.roleKey, item.userId]));
  if (tier.roles.some((roleKey) => !byRole.has(roleKey))) return null;

  const committeeName = `${loan.branch.branchCode} · ${tier.label}`;
  let configuredCommittee = await prisma.creditCommittee.findFirst({ where: { committeeName, branchId: loan.branchId } });
  configuredCommittee = configuredCommittee
    ? await prisma.creditCommittee.update({ where: { id: configuredCommittee.id }, data: { minLoanAmount: tier.min, maxLoanAmount: tier.max, status: "ACTIVE" } })
    : await prisma.creditCommittee.create({ data: { committeeName, branchId: loan.branchId, isHeadOfficeCommittee: false, minLoanAmount: tier.min, maxLoanAmount: tier.max } });
  await prisma.creditCommitteeMember.deleteMany({ where: { creditCommitteeId: configuredCommittee.id } });
  await prisma.creditCommitteeMember.createMany({ data: tier.roles.map((roleKey, index) => ({ creditCommitteeId: configuredCommittee!.id, userId: byRole.get(roleKey)!, committeeRole: committeeRoleLabel(roleKey), approvalSequence: index + 1, isRequired: true })) });

  const committee = await prisma.creditCommittee.findFirst({
    where: {
      id: configuredCommittee.id,
      status: "ACTIVE",
      minLoanAmount: { lte: new Prisma.Decimal(amount) },
      AND: [
        { OR: [{ maxLoanAmount: null }, { maxLoanAmount: { gte: new Prisma.Decimal(amount) } }] },
        { OR: [{ isHeadOfficeCommittee: true }, { branchId: loan.branchId }] }
      ]
    },
    include: { members: { where: { isRequired: true }, orderBy: { approvalSequence: "asc" } } },
    orderBy: [{ isHeadOfficeCommittee: "asc" }, { minLoanAmount: "desc" }]
  });

  if (!committee) return null;

  for (const member of committee.members) {
    const exists = await prisma.creditCommitteeReview.findFirst({
      where: { loanApplicationId, creditCommitteeId: committee.id, committeeRole: member.committeeRole }
    });
    if (!exists) {
      await prisma.creditCommitteeReview.create({
        data: { loanApplicationId, creditCommitteeId: committee.id, reviewerId: member.userId, committeeRole: member.committeeRole, approvalSequence: member.approvalSequence, decision: "PENDING" }
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      action: "Submit for review",
      entityType: "LoanApplication",
      entityId: String(loanApplicationId),
      newValue: { creditCommitteeId: committee.id, committeeName: committee.committeeName }
    }
  });
  return committee;
}
