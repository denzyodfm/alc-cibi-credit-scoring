import { NextResponse } from "next/server";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { computeScorecard, routeToCreditCommittee } from "@/lib/scorecard";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await context.params;
  const loanApplicationId = Number(rawId);
  const loan = await prisma.loanApplication.findUnique({ where: { id: loanApplicationId } });
  if (!loan || !canAccessBranch(user, loan.branchId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const computed = await computeScorecard(body.items ?? []);

  const saved = await prisma.$transaction(async (tx) => {
    const scorecard = await tx.creditScorecard.upsert({
      where: { loanApplicationId },
      update: {
        characterScore: computed.categoryScores.Character ?? 0,
        capacityScore: computed.categoryScores.Capacity ?? 0,
        capitalScore: computed.categoryScores.Capital ?? 0,
        collateralScore: computed.categoryScores.Collateral ?? 0,
        conditionsScore: computed.categoryScores.Conditions ?? 0,
        overallScore: computed.overallScore,
        result: computed.result,
        autoDqTriggered: computed.autoDqTriggered,
        autoDqReason: computed.autoDqReason,
        scoredBy: user.id,
        scoredAt: new Date()
      },
      create: {
        loanApplicationId,
        characterScore: computed.categoryScores.Character ?? 0,
        capacityScore: computed.categoryScores.Capacity ?? 0,
        capitalScore: computed.categoryScores.Capital ?? 0,
        collateralScore: computed.categoryScores.Collateral ?? 0,
        conditionsScore: computed.categoryScores.Conditions ?? 0,
        overallScore: computed.overallScore,
        result: computed.result,
        autoDqTriggered: computed.autoDqTriggered,
        autoDqReason: computed.autoDqReason,
        scoredBy: user.id,
        scoredAt: new Date()
      }
    });
    await tx.creditScorecardItem.deleteMany({ where: { scorecardId: scorecard.id } });
    await tx.creditScorecardItem.createMany({
      data: computed.itemRows.map((item) => ({
        scorecardId: scorecard.id,
        category: item.category,
        subCriterionCode: item.subCriterionCode,
        subCriterionName: item.subCriterionName,
        score: item.score,
        isNa: item.isNa,
        naTreatment: item.naTreatment,
        weightedIncluded: item.weightedIncluded,
        autoDqIfZero: item.autoDqIfZero,
        remarks: item.remarks
      }))
    });
    await tx.loanApplication.update({
      where: { id: loanApplicationId },
      data: { status: computed.result }
    });
    return scorecard;
  });

  if (computed.result === "FOR_CREDIT_COMMITTEE" || computed.result === "PROCEED") {
    await routeToCreditCommittee(loanApplicationId, user.id);
  }
  await audit({ userId: user.id, action: "Scorecard update", entityType: "CreditScorecard", entityId: saved.id, newValue: computed });
  return NextResponse.json(computed);
}
