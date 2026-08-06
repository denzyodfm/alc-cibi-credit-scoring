import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  months: z.coerce.number().int().positive()
});

export async function GET() {
  await requireUser();
  const terms = await prisma.loanTermOption.findMany({ orderBy: [{ sortOrder: "asc" }, { months: "asc" }] });
  return NextResponse.json(terms);
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.parse(await request.json());
  const count = await prisma.loanTermOption.count();
  const term = await prisma.loanTermOption.create({ data: { months: parsed.months, sortOrder: count } });
  await audit({ userId: user.id, action: "Loan term creation", entityType: "LoanTermOption", entityId: term.id, newValue: term });
  return NextResponse.json(term);
}
