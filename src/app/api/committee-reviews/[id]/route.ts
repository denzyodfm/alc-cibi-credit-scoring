import { NextResponse } from "next/server";
import { z } from "zod";
import { canReviewCredit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  decision: z.enum(["PENDING", "APPROVED", "DENIED", "RETURNED_FOR_COMPLETION"]),
  remarks: z.string().optional()
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canReviewCredit(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const body = schema.parse(await request.json());
  const existing = await prisma.creditCommitteeReview.findUnique({ where: { id }, include: { loanApplication: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const review = await prisma.creditCommitteeReview.update({
    where: { id },
    data: { decision: body.decision, remarks: body.remarks, reviewedAt: body.decision === "PENDING" ? null : new Date() }
  });

  if (body.decision === "APPROVED") {
    await prisma.loanApplication.update({ where: { id: existing.loanApplicationId }, data: { status: "APPROVED" } });
  } else if (body.decision === "DENIED") {
    await prisma.loanApplication.update({ where: { id: existing.loanApplicationId }, data: { status: "DENIED" } });
  } else if (body.decision === "RETURNED_FOR_COMPLETION") {
    await prisma.loanApplication.update({ where: { id: existing.loanApplicationId }, data: { status: "CI_BI_IN_PROGRESS" } });
  }

  await audit({ userId: user.id, action: "Credit Committee decision", entityType: "CreditCommitteeReview", entityId: id, oldValue: existing, newValue: review });
  return NextResponse.json(review);
}
