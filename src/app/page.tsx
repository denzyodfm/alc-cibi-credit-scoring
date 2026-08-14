import { redirect } from "next/navigation";
import { getCurrentUser, isCommitteeAdministrator } from "@/lib/auth";
import { COMMITTEE_STAGE_ORDER, stageSlug } from "@/lib/committee-config";
import { prisma } from "@/lib/prisma";

/**
 * Committee members land on their own queue rather than the dashboard, so the first thing they
 * see on login is whether anything is waiting on them. Administrators keep the dashboard, since
 * they oversee every stage rather than holding one.
 */
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isCommitteeAdministrator(user)) redirect("/dashboard");

  const seats = await prisma.branchCommitteeAssignment.findMany({
    where: { userId: user.id },
    select: { roleKey: true }
  });
  if (!seats.length) redirect("/dashboard");

  // Someone holding several seats lands on the earliest stage in the chain.
  const held = new Set(seats.map((seat) => seat.roleKey));
  const first = COMMITTEE_STAGE_ORDER.find((roleKey) => held.has(roleKey));
  redirect(first ? `/committee/${stageSlug(first)}` : "/dashboard");
}
