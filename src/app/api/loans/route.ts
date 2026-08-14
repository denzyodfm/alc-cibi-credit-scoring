import { NextResponse } from "next/server";
import { badRequest } from "@/lib/http";
import { z } from "zod";
import { canAccessAllBranches, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  applicantName: z.string().min(1),
  loanProduct: z.string().min(1),
  amountApplied: z.coerce.number().nonnegative(),
  ciDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  loanOfficerId: z.coerce.number(),
  loanPurpose: z.string().optional()
});

export async function POST(request: Request) {
  const user = await requireUser();
  const __parsed = schema.safeParse(await request.json().catch(() => null));
  if (!__parsed.success) return badRequest(__parsed.error);
  const parsed = __parsed.data;
  const loanOfficerId = user.role === "ACCOUNT_OFFICER" ? user.id : parsed.loanOfficerId;
  const officer = await prisma.user.findUniqueOrThrow({ where: { id: loanOfficerId }, include: { branch: true } });
  const branchId = canAccessAllBranches(user) ? officer.branchId : user.branchId;
  if (!canAccessAllBranches(user) && officer.branchId !== user.branchId) {
    return NextResponse.json({ error: "Cannot assign another branch officer" }, { status: 403 });
  }
  const branch = await prisma.branch.findUniqueOrThrow({ where: { id: branchId } });
  const sequence = await prisma.loanApplication.count();
  const applicationNo = `ALC-${new Date().getFullYear()}-${String(sequence + 1).padStart(5, "0")}`;
  const loan = await prisma.loanApplication.create({
    data: {
      applicationNo,
      ciFormNo: `CI-${branch.branchCode}-${String(sequence + 1).padStart(5, "0")}`,
      dateOfCi: new Date(`${parsed.ciDate}T00:00:00`),
      loanOfficerId: officer.id,
      branchId,
      branchCode: branch.branchCode,
      loanPurpose: parsed.loanPurpose,
      loanProduct: parsed.loanProduct,
      amountApplied: parsed.amountApplied,
      createdBy: user.id,
      status: "CI_BI_IN_PROGRESS",
      applicantProfile: { create: { fullName: parsed.applicantName } }
    }
  });
  await audit({ userId: user.id, action: "Create loan application", entityType: "LoanApplication", entityId: loan.id, newValue: loan });
  return NextResponse.json({ id: loan.id });
}
