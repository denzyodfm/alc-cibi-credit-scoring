import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ reviewerId: z.coerce.number().int().positive() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Only setup administrators can change approvers." }, { status: 403 });
  const reviewId = Number((await context.params).id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select a valid approver." }, { status: 400 });
  const [review, reviewer] = await Promise.all([
    prisma.creditCommitteeReview.findUnique({ where: { id: reviewId } }),
    prisma.user.findFirst({ where: { id: parsed.data.reviewerId, status: "ACTIVE" } })
  ]);
  if (!review || !reviewer) return NextResponse.json({ error: "Review or approver not found." }, { status: 404 });
  if (review.decision !== "PENDING") return NextResponse.json({ error: "A completed approval stage cannot be reassigned." }, { status: 409 });
  await prisma.creditCommitteeReview.update({ where: { id: reviewId }, data: { reviewerId: reviewer.id } });
  await prisma.auditLog.create({ data: { userId: user.id, action: `Reassigned approval stage to user ${reviewer.id}`, entityType: "CreditCommitteeReview", entityId: String(reviewId) } });
  return NextResponse.json({ ok: true });
}
