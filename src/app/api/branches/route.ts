import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  branchCode: z.string().min(1),
  branchName: z.string().min(1),
  branchAddress: z.string().optional(),
  isHeadOffice: z.union([z.literal("true"), z.boolean()]).optional()
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.parse(await request.json());
  const branch = await prisma.branch.create({
    data: {
      branchCode: parsed.branchCode,
      branchName: parsed.branchName,
      branchAddress: parsed.branchAddress,
      isHeadOffice: Boolean(parsed.isHeadOffice)
    }
  });
  await audit({ userId: user.id, action: "Branch creation/update", entityType: "Branch", entityId: branch.id, newValue: branch });
  return NextResponse.json(branch);
}
