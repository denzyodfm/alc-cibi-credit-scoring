import { NextResponse } from "next/server";
import { badRequest } from "@/lib/http";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  label: z.string().min(1)
});

export async function GET() {
  await requireUser();
  const options = await prisma.residenceTypeOption.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  return NextResponse.json(options);
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const __parsed = schema.safeParse(await request.json().catch(() => null));
  if (!__parsed.success) return badRequest(__parsed.error);
  const parsed = __parsed.data;
  const count = await prisma.residenceTypeOption.count();
  const option = await prisma.residenceTypeOption.create({ data: { label: parsed.label, sortOrder: count } });
  await audit({ userId: user.id, action: "Residence type creation", entityType: "ResidenceTypeOption", entityId: option.id, newValue: option });
  return NextResponse.json(option);
}
