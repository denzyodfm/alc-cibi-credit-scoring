import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ requirementType: z.string().min(1).max(80), label: z.string().min(1).max(160), status: z.enum(["PENDING", "SUBMITTED", "VERIFIED"]), fileName: z.string().max(255).optional(), documentMimeType: z.string().max(80).optional(), documentDataUrl: z.string().max(4_200_000).optional() });

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const loan = await prisma.loanApplication.findUnique({ where: { id } });
  if (!loan || !canAccessBranch(user, loan.branchId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["ENDORSED", "FOR_CREDIT_COMMITTEE"].includes(loan.status)) return NextResponse.json({ error: "Requirements are locked until endorsement." }, { status: 400 });
  const body = schema.parse(await request.json());
  const item = await prisma.loanRequirement.upsert({ where: { loanApplicationId_requirementType: { loanApplicationId: id, requirementType: body.requirementType } }, update: body, create: { ...body, loanApplicationId: id } });
  return NextResponse.json(item);
}
