import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  label: z.string().min(1)
});

export async function GET() {
  await requireUser();
  const options = await prisma.sexOption.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  return NextResponse.json(options);
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.parse(await request.json());
  const count = await prisma.sexOption.count();
  const option = await prisma.sexOption.create({ data: { label: parsed.label, sortOrder: count } });
  await audit({ userId: user.id, action: "Sex option creation", entityType: "SexOption", entityId: option.id, newValue: option });
  return NextResponse.json(option);
}
