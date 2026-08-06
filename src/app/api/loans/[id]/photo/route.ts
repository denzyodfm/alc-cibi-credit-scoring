import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const MAX_DATA_URL_LENGTH = 2_800_000;
const ALLOWED_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const schema = z.object({
  photoDataUrl: z.string().max(MAX_DATA_URL_LENGTH).regex(ALLOWED_DATA_URL)
});

async function accessibleLoan(user: Awaited<ReturnType<typeof requireUser>>, id: number) {
  const loan = await prisma.loanApplication.findUnique({ where: { id }, select: { id: true, branchId: true } });
  return loan && canAccessBranch(user, loan.branchId) ? loan : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const loan = await accessibleLoan(user, id);
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use a JPG, PNG, or WebP image up to 2 MB." }, { status: 400 });
  const mimeType = parsed.data.photoDataUrl.slice(5, parsed.data.photoDataUrl.indexOf(";"));

  await prisma.applicantProfile.update({
    where: { loanApplicationId: id },
    data: { photoDataUrl: parsed.data.photoDataUrl, photoMimeType: mimeType }
  });
  await audit({ userId: user.id, action: "Applicant photo update", entityType: "ApplicantProfile", entityId: id, newValue: { mimeType } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const loan = await accessibleLoan(user, id);
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.applicantProfile.update({
    where: { loanApplicationId: id },
    data: { photoDataUrl: null, photoMimeType: null }
  });
  await audit({ userId: user.id, action: "Applicant photo removal", entityType: "ApplicantProfile", entityId: id });
  return NextResponse.json({ ok: true });
}
