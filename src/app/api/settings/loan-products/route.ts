import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1)
});

export async function GET() {
  await requireUser();
  const products = await prisma.loanProduct.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.parse(await request.json());
  const count = await prisma.loanProduct.count();
  const product = await prisma.loanProduct.create({ data: { name: parsed.name, sortOrder: count } });
  await audit({ userId: user.id, action: "Loan product creation", entityType: "LoanProduct", entityId: product.id, newValue: product });
  return NextResponse.json(product);
}
