import { NextResponse } from "next/server";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const nullableNumberFields = new Set([
  "age",
  "yearsAtAddress",
  "spouseMonthlyIncome",
  "numberOfDependents",
  "dependentsUnder18",
  "grossMonthlySalary",
  "netMonthlyTakeHomePay",
  "pensionMonthlyAmount",
  "averageMonthlyGrossRevenue",
  "averageMonthlyNetIncome",
  "originalAmount",
  "outstandingBalance",
  "monthlyObligation",
  "estimatedValue",
  "appraisedValue"
]);

function cleanObject(input: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (value === "") return [key, null];
      if (nullableNumberFields.has(key) && value !== null && value !== undefined) return [key, Number(value)];
      return [key, value];
    })
  );
}

function cleanRows(rows: Record<string, unknown>[] = []) {
  return rows.map((row) => cleanObject(row)).filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && value !== ""));
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const existing = await prisma.loanApplication.findUnique({ where: { id } });
  if (!existing || !canAccessBranch(user, existing.branchId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const loanData = cleanObject(body.loan);
  const applicantData = cleanObject(body.applicant);
  const householdData = cleanObject(body.household);
  const incomeData = cleanObject(body.income);

  await prisma.$transaction(async (tx) => {
    await tx.loanApplication.update({
      where: { id },
      data: {
        ciFormNo: loanData.ciFormNo as string | null,
        loanProduct: loanData.loanProduct as string | null,
        loanPurpose: loanData.loanPurpose as string | null,
        desiredTerms: loanData.desiredTerms as string | null,
        amountApplied: Number(loanData.amountApplied ?? existing.amountApplied),
        proposedAmortization: loanData.proposedAmortization === null ? null : Number(loanData.proposedAmortization ?? 0),
        status: existing.status === "DRAFT" ? "CI_BI_IN_PROGRESS" : existing.status
      }
    });
    await tx.applicantProfile.upsert({
      where: { loanApplicationId: id },
      update: applicantData,
      create: { ...applicantData, loanApplicationId: id, fullName: String(applicantData.fullName || "Unnamed Applicant") }
    });
    await tx.householdBackground.upsert({
      where: { loanApplicationId: id },
      update: householdData,
      create: { ...householdData, loanApplicationId: id }
    });
    await tx.incomeProfile.upsert({
      where: { loanApplicationId: id },
      update: incomeData,
      create: { ...incomeData, loanApplicationId: id }
    });
    await tx.existingLiability.deleteMany({ where: { loanApplicationId: id } });
    await tx.existingLiability.createMany({ data: cleanRows(body.liabilities).map((row) => ({ ...row, loanApplicationId: id, creditor: String(row.creditor || "Creditor") })) as any[] });
    await tx.characterReference.deleteMany({ where: { loanApplicationId: id } });
    await tx.characterReference.createMany({ data: cleanRows(body.references).map((row) => ({ ...row, loanApplicationId: id, referenceName: String(row.referenceName || "Reference") })) as any[] });
    await tx.asset.deleteMany({ where: { loanApplicationId: id } });
    await tx.asset.createMany({ data: cleanRows(body.assets).map((row) => ({ ...row, loanApplicationId: id, assetType: String(row.assetType || "Asset") })) as any[] });
    await tx.collateral.deleteMany({ where: { loanApplicationId: id } });
    await tx.collateral.createMany({ data: cleanRows(body.collateral).map((row) => ({ ...row, loanApplicationId: id })) as any[] });
  });

  await audit({ userId: user.id, action: "Update loan application", entityType: "LoanApplication", entityId: id, oldValue: existing, newValue: body });
  return NextResponse.json({ ok: true });
}
