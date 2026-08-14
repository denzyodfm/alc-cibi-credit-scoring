import { NextResponse } from "next/server";
import { canAccessAllBranches, canAccessBranch, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { pickWritable, pickWritableRows } from "@/lib/model-fields";

const nullableNumberFields = new Set([
  "age",
  "yearsAtAddress",
  "spouseYearsAtAddress",
  "spouseMonthlyIncome",
  "numberOfDependents",
  "dependentsUnder18",
  "grossMonthlySalary",
  "netMonthlyTakeHomePay",
  "pensionMonthlyAmount",
  "averageMonthlyGrossRevenue",
  "averageMonthlyNetIncome",
  "ofwTotalYears",
  "yearsOfOperations",
  "yearsOfExperience",
  "monthlySalaryForeign",
  "monthlySalaryPhp",
  "deceasedMemberMonthlyPension",
  "pensionTotalYearsWeService",
  "rentAmount",
  "monthlyRentOrMortgage",
  "declaredValue",
  "marketValue",
  "costPerUnit",
  "totalCost",
  "amount",
  "income",
  "expense",
  "sortOrder",
  "originalAmount",
  "outstandingBalance",
  "monthlyObligation",
  "estimatedValue",
  "appraisedValue"
]);

/**
 * Numeric columns arrive as strings from the form. Grouping separators and stray spaces are
 * tolerated, but anything that is not a real number is reported rather than coerced: `Number()`
 * turns "1,234" and "abc" into NaN, which Prisma would either reject with a 500 or persist as a
 * meaningless value.
 */
function parseNumeric(value: unknown): { ok: true; value: number | null } | { ok: false } {
  if (value === null || value === undefined || value === "") return { ok: true, value: null };
  const normalized = String(value).replace(/[,\s]/g, "");
  if (normalized === "") return { ok: true, value: null };
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? { ok: true, value: parsed } : { ok: false };
}

function cleanObject(input: Record<string, unknown> = {}, invalidKeys: string[] = []) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (value === "") return [key, null];
      if (nullableNumberFields.has(key) && value !== null && value !== undefined) {
        const parsed = parseNumeric(value);
        if (!parsed.ok) {
          invalidKeys.push(key);
          return [key, null];
        }
        return [key, parsed.value];
      }
      return [key, value];
    })
  );
}

function cleanRows(rows: Record<string, unknown>[] = [], invalidKeys: string[] = []) {
  return rows
    .map((row) => cleanObject(row, invalidKeys))
    .filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && value !== ""));
}

const PH_MOBILE_PATTERN = /^09\d{9}$/;

function composeFullName(lastName: unknown, firstName: unknown, middleName: unknown) {
  const last = String(lastName ?? "").trim();
  const first = String(firstName ?? "").trim();
  const middle = String(middleName ?? "").trim();
  const firstMiddle = [first, middle].filter(Boolean).join(" ");
  if (last && firstMiddle) return `${last}, ${firstMiddle}`;
  return last || firstMiddle || null;
}

function composeAddress(street: unknown, barangay: unknown, city: unknown, province: unknown, region: unknown) {
  const parts = [street, barangay ? `Brgy. ${barangay}` : null, city, province, region]
    .map((part) => (part ? String(part).trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function computeAgeFromDob(dob: Date | null, until: Date | null = null) {
  if (!dob || Number.isNaN(dob.getTime())) return null;
  const end = until && !Number.isNaN(until.getTime()) ? until : new Date();
  let age = end.getFullYear() - dob.getFullYear();
  const monthDiff = end.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}

function parseDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const existing = await prisma.loanApplication.findUnique({ where: { id } });
  if (!existing || !canAccessBranch(user, existing.branchId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const invalidNumbers: string[] = [];
  const droppedFields: string[] = [];
  const loanData = cleanObject(body.loan, invalidNumbers);
  const applicantData = cleanObject(pickWritable("ApplicantProfile", body.applicant, droppedFields), invalidNumbers);
  const householdData = cleanObject(pickWritable("HouseholdBackground", body.household, droppedFields), invalidNumbers);
  const incomeData = cleanObject(pickWritable("IncomeProfile", body.income, droppedFields), invalidNumbers);

  if (invalidNumbers.length) {
    const fields = [...new Set(invalidNumbers)].join(", ");
    return NextResponse.json({ error: `These fields must be valid numbers: ${fields}` }, { status: 400 });
  }

  const dateOfCi = parseDate(loanData.dateOfCi);
  if (!dateOfCi) return NextResponse.json({ error: "Invalid CI date" }, { status: 400 });

  if (applicantData.contactNumber && !PH_MOBILE_PATTERN.test(String(applicantData.contactNumber))) {
    return NextResponse.json({ error: "Contact number must be a valid Philippine mobile number (11 digits starting with 09)" }, { status: 400 });
  }
  if (applicantData.alternateContact && !PH_MOBILE_PATTERN.test(String(applicantData.alternateContact))) {
    return NextResponse.json({ error: "Alternate contact number must be a valid Philippine mobile number (11 digits starting with 09)" }, { status: 400 });
  }

  const dob = applicantData.dateOfBirth ? new Date(String(applicantData.dateOfBirth)) : null;
  if (applicantData.dateOfBirth && Number.isNaN(dob?.getTime())) {
    return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
  }
  applicantData.dateOfBirth = dob;
  const ageFromDob = computeAgeFromDob(dob);
  if (ageFromDob !== null) applicantData.age = ageFromDob;

  const fatherDob = parseDate(householdData.fatherDob);
  const fatherDod = parseDate(householdData.fatherDod);
  const motherDob = parseDate(householdData.motherDob);
  const motherDod = parseDate(householdData.motherDod);
  householdData.fatherDob = fatherDob;
  householdData.fatherDod = fatherDod;
  householdData.fatherAge = computeAgeFromDob(fatherDob, fatherDod);
  householdData.motherDob = motherDob;
  householdData.motherDod = motherDod;
  householdData.motherAge = computeAgeFromDob(motherDob, motherDod);
  householdData.isPrimaryIncomeEarner =
    householdData.isPrimaryIncomeEarner === null || householdData.isPrimaryIncomeEarner === undefined
      ? null
      : String(householdData.isPrimaryIncomeEarner) === "true";

  for (const key of ["pensionStartDate", "contractStartDate", "contractEndDate", "deceasedMemberPensionStart"]) {
    if (key in incomeData) incomeData[key] = parseDate(incomeData[key]);
  }

  /** Row-level date columns are posted as yyyy-mm-dd strings and must become Date objects. */
  const withRowDates = (rows: Record<string, unknown>[], keys: string[]) =>
    rows.map((row) => {
      for (const key of keys) if (key in row) row[key] = parseDate(row[key]);
      return row;
    });

  const composedFullName = composeFullName(applicantData.lastName, applicantData.firstName, applicantData.middleName);
  if (composedFullName) applicantData.fullName = composedFullName;
  applicantData.currentAddress = composeAddress(
    applicantData.addressStreet,
    applicantData.addressBarangay,
    applicantData.addressCityMunicipality,
    applicantData.addressProvince,
    applicantData.addressRegion
  );
  applicantData.permanentAddress = composeAddress(
    applicantData.permanentAddressStreet,
    applicantData.permanentAddressBarangay,
    applicantData.permanentAddressCityMunicipality,
    applicantData.permanentAddressProvince,
    applicantData.permanentAddressRegion
  );

  let officerReassignment: { loanOfficerId: number; branchId: number; branchCode: string } | null = null;
  const requestedOfficerId = loanData.loanOfficerId ? Number(loanData.loanOfficerId) : null;
  if (user.role !== "ACCOUNT_OFFICER" && requestedOfficerId && requestedOfficerId !== existing.loanOfficerId) {
    const officer = await prisma.user.findUniqueOrThrow({ where: { id: requestedOfficerId }, include: { branch: true } });
    if (!canAccessAllBranches(user) && officer.branchId !== user.branchId) {
      return NextResponse.json({ error: "Cannot assign another branch officer" }, { status: 403 });
    }
    officerReassignment = { loanOfficerId: officer.id, branchId: officer.branchId, branchCode: officer.branch.branchCode };
  }

  await prisma.$transaction(async (tx) => {
    await tx.loanApplication.update({
      where: { id },
      data: {
        ciFormNo: loanData.ciFormNo as string | null,
        dateOfCi,
        loanProduct: loanData.loanProduct as string | null,
        loanPurpose: loanData.loanPurpose as string | null,
        loanPurposeCategory: loanData.loanPurposeCategory as string | null,
        aoClientRemarks: loanData.aoClientRemarks as string | null,
        desiredTerms: loanData.desiredTerms as string | null,
        amountApplied: Number(loanData.amountApplied ?? existing.amountApplied),
        proposedAmortization: loanData.proposedAmortization === null ? null : Number(loanData.proposedAmortization ?? 0),
        status: existing.status === "DRAFT" ? "CI_BI_IN_PROGRESS" : existing.status,
        ...officerReassignment
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
    await tx.existingLiability.createMany({
      data: withRowDates(cleanRows(pickWritableRows("ExistingLiability", body.liabilities, droppedFields), invalidNumbers), ["dueDate"]).map((row) => ({ ...row, loanApplicationId: id, creditor: String(row.creditor || "Creditor") })) as any[]
    });
    await tx.characterReference.deleteMany({ where: { loanApplicationId: id } });
    await tx.characterReference.createMany({ data: cleanRows(pickWritableRows("CharacterReference", body.references, droppedFields), invalidNumbers).map((row) => ({ ...row, loanApplicationId: id, referenceName: String(row.referenceName || "Reference") })) as any[] });
    await tx.asset.deleteMany({ where: { loanApplicationId: id } });
    await tx.asset.createMany({ data: cleanRows(pickWritableRows("Asset", body.assets, droppedFields), invalidNumbers).map((row) => ({ ...row, loanApplicationId: id, assetType: String(row.assetType || "Asset") })) as any[] });
    await tx.collateral.deleteMany({ where: { loanApplicationId: id } });
    await tx.collateral.createMany({
      data: withRowDates(cleanRows(pickWritableRows("Collateral", body.collateral, droppedFields), invalidNumbers), ["dateLastAppraised", "dateAcquired", "expiryDate"]).map((row) => ({ ...row, loanApplicationId: id })) as any[]
    });
    await tx.attachedProperty.deleteMany({ where: { loanApplicationId: id } });
    await tx.attachedProperty.createMany({ data: cleanRows(pickWritableRows("AttachedProperty", body.attachedProperties, droppedFields), invalidNumbers).map((row) => ({ ...row, loanApplicationId: id })) as any[] });
    await tx.businessContact.deleteMany({ where: { loanApplicationId: id } });
    await tx.businessContact.createMany({
      data: cleanRows(pickWritableRows("BusinessContact", body.businessContacts, droppedFields), invalidNumbers).map((row) => ({ ...row, loanApplicationId: id, kind: String(row.kind || "SUPPLIER") })) as any[]
    });
    await tx.cashFlowEntry.deleteMany({ where: { loanApplicationId: id } });
    await tx.cashFlowEntry.createMany({
      data: cleanRows(pickWritableRows("CashFlowEntry", body.cashFlows, droppedFields), invalidNumbers).map((row) => ({ ...row, loanApplicationId: id, entryType: String(row.entryType || "Income") })) as any[]
    });
    await tx.cropProduction.deleteMany({ where: { loanApplicationId: id } });
    await tx.cropProduction.createMany({ data: cleanRows(pickWritableRows("CropProduction", body.cropProductions, droppedFields), invalidNumbers).map((row) => ({ ...row, loanApplicationId: id })) as any[] });
    await tx.farmCostItem.deleteMany({ where: { loanApplicationId: id } });
    await tx.farmCostItem.createMany({ data: cleanRows(pickWritableRows("FarmCostItem", body.farmCostItems, droppedFields), invalidNumbers).map((row) => ({ ...row, loanApplicationId: id })) as any[] });
  });

  // Key names only — never the values, which may be large or sensitive. A populated list means
  // either a client/server field mismatch worth fixing, or someone probing for writable columns.
  if (droppedFields.length) {
    const unique = [...new Set(droppedFields)];
    console.warn(`[loans:${id}] ignored ${unique.length} unwritable field(s) from user ${user.id}: ${unique.join(", ")}`);
  }

  await audit({
    userId: user.id,
    action: "Update loan application",
    entityType: "LoanApplication",
    entityId: id,
    oldValue: existing,
    newValue: droppedFields.length ? { ...body, __ignoredFields: [...new Set(droppedFields)] } : body
  });
  return NextResponse.json({ ok: true });
}
