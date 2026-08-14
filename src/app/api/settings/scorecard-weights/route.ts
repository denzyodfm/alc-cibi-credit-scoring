import { NextResponse } from "next/server";
import { badRequest } from "@/lib/http";
import { z } from "zod";
import { canManageSetup, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const CATEGORIES = ["Character", "Capacity", "Capital", "Collateral", "Conditions"] as const;

const schema = z.object({
  weights: z
    .array(z.object({ category: z.enum(CATEGORIES), weightPercent: z.number().min(0).max(100) }))
    .length(CATEGORIES.length)
});

export async function GET() {
  await requireUser();
  const settings = await prisma.scorecardSetting.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(settings.map((item) => ({ category: item.category, weightPercent: Number(item.weightPercent) })));
}

export async function PUT(request: Request) {
  const user = await requireUser();
  if (!canManageSetup(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);

  const categories = parsed.data.weights.map((item) => item.category);
  if (new Set(categories).size !== CATEGORIES.length) {
    return NextResponse.json({ error: "Each of the five categories must appear exactly once." }, { status: 400 });
  }

  // Category scores are already normalised to their weight, so the overall score is only a
  // percentage if the weights add up to 100. Anything else silently rescales every application.
  const total = parsed.data.weights.reduce((sum, item) => sum + item.weightPercent, 0);
  if (Math.abs(total - 100) > 0.01) {
    return NextResponse.json({ error: `Weights must total 100%. They currently total ${total.toFixed(2)}%.` }, { status: 400 });
  }

  const before = await prisma.scorecardSetting.findMany({ orderBy: { id: "asc" } });
  await prisma.$transaction(
    parsed.data.weights.map((item) =>
      prisma.scorecardSetting.upsert({
        where: { category: item.category },
        update: { weightPercent: item.weightPercent, isActive: true },
        create: { category: item.category, weightPercent: item.weightPercent, isActive: true }
      })
    )
  );

  await audit({
    userId: user.id,
    action: "Scorecard weights update",
    entityType: "ScorecardSetting",
    entityId: 0,
    oldValue: before.map((item) => ({ category: item.category, weightPercent: Number(item.weightPercent) })),
    newValue: parsed.data.weights
  });
  return NextResponse.json({ ok: true });
}
