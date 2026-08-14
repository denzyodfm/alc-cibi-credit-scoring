import { NextResponse } from "next/server";
import { badRequest } from "@/lib/http";
import { z } from "zod";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Only formats a loan officer would attach as proof, and only as a well-formed base64 data URL.
 * Without the pattern any data URL is storable — including data:text/html, which becomes an
 * active-content payload the moment the document is opened in a browser tab.
 */
const ALLOWED_DOCUMENT_DATA_URL = /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/;
const ALLOWED_DOCUMENT_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

const schema = z.object({
  requirementType: z.string().min(1).max(80),
  label: z.string().min(1).max(160),
  status: z.enum(["PENDING", "SUBMITTED", "VERIFIED"]),
  fileName: z.string().max(255).optional(),
  documentMimeType: z.enum(ALLOWED_DOCUMENT_MIME).optional(),
  documentDataUrl: z.string().max(4_200_000).regex(ALLOWED_DOCUMENT_DATA_URL).optional()
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const loan = await prisma.loanApplication.findUnique({ where: { id } });
  if (!loan || !canAccessBranch(user, loan.branchId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["ENDORSED", "FOR_CREDIT_COMMITTEE"].includes(loan.status)) return NextResponse.json({ error: "Requirements are locked until endorsement." }, { status: 400 });
  const __parsed = schema.safeParse(await request.json().catch(() => null));
  if (!__parsed.success) return badRequest(__parsed.error);
  const body = __parsed.data;
  const item = await prisma.loanRequirement.upsert({ where: { loanApplicationId_requirementType: { loanApplicationId: id, requirementType: body.requirementType } }, update: body, create: { ...body, loanApplicationId: id } });
  return NextResponse.json(item);
}
