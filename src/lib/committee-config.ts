export const COMMITTEE_ROLES = [
  ["BRANCH_AA", "Branch AA"], ["BRANCH_SENIOR_AO", "Branch Senior AO"],
  ["BRANCH_BOOKKEEPER", "Branch Bookkeeper"], ["BRANCH_CASHIER", "Branch Cashier"],
  ["BRANCH_TL", "Branch Team Leader"], ["BRANCH_MA", "Branch MA"],
  ["AREA_TL", "Area Team Leader"], ["HEAD_OFFICE_TL", "Head Office Team Leader"],
  ["REMEDIAL", "Remedial"], ["ACCOUNTING", "Accounting"],
  ["HEAD_OFFICE_CASHIER", "Head Office Cashier"], ["CMG", "CMG"],
  ["FINANCE_MANAGER", "Finance Manager"], ["PRESIDENT", "President"]
] as const;

/**
 * Approval chains by loan amount. Each tier lists every stage in the order it must approve, and
 * the last entry is that tier's final approver:
 *   up to 30k      Branch Team Leader signs off
 *   30k to 90k     Remedial then Head Office Team Leader signs off
 *   above 90k      every committee, with Accounting and CMG ahead of the Finance Manager
 */
export const APPROVAL_TIERS = [
  { key: "LOW", label: "Up to ₱30,000", min: 0, max: 30000, roles: ["BRANCH_BOOKKEEPER", "BRANCH_TL"] },
  { key: "MID", label: "₱30,000.01–₱90,000", min: 30000.01, max: 90000, roles: ["BRANCH_BOOKKEEPER", "BRANCH_TL", "AREA_TL", "REMEDIAL", "HEAD_OFFICE_TL"] },
  {
    key: "HIGH",
    label: "Above ₱90,000",
    min: 90000.01,
    max: null,
    roles: ["BRANCH_BOOKKEEPER", "BRANCH_TL", "AREA_TL", "REMEDIAL", "HEAD_OFFICE_TL", "ACCOUNTING", "CMG", "FINANCE_MANAGER"]
  }
] as const;

export function committeeRoleLabel(roleKey: string) { return COMMITTEE_ROLES.find(([key]) => key === roleKey)?.[1] || roleKey.replaceAll("_", " "); }

/**
 * The tier an amount falls into.
 *
 * Matching on the upper bound alone is deliberate. Testing `amount >= tier.min` as well leaves a
 * gap wherever one tier ends at 30,000 and the next starts at 30,000.01: an amount in between
 * matches nothing, and the caller sees "no committee configured" rather than a routing decision.
 * Tiers are ordered ascending, so the first one whose ceiling covers the amount is the right one.
 */
export function tierForAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  return APPROVAL_TIERS.find((tier) => tier.max === null || amount <= tier.max);
}

export function approvalStageLimit(amount: number) {
  return tierForAmount(amount)?.roles.length ?? 0;
}

/** The ordered committee roles a loan of this amount must pass through. */
export function stagesForAmount(amount: number): readonly string[] {
  return tierForAmount(amount)?.roles ?? [];
}

/** Committee roles in the order they can ever appear, for menus and queue pages. */
export const COMMITTEE_STAGE_ORDER = [
  "BRANCH_BOOKKEEPER",
  "BRANCH_TL",
  "AREA_TL",
  "REMEDIAL",
  "HEAD_OFFICE_TL",
  "ACCOUNTING",
  "CMG",
  "FINANCE_MANAGER"
] as const;

export type CommitteeStageKey = (typeof COMMITTEE_STAGE_ORDER)[number];

export function isCommitteeStageKey(value: string): value is CommitteeStageKey {
  return (COMMITTEE_STAGE_ORDER as readonly string[]).includes(value);
}

/** URL slug for a stage, e.g. BRANCH_BOOKKEEPER -> branch-bookkeeper. */
export function stageSlug(roleKey: string) {
  return roleKey.toLowerCase().replaceAll("_", "-");
}

export function stageKeyFromSlug(slug: string) {
  const key = slug.toUpperCase().replaceAll("-", "_");
  return isCommitteeStageKey(key) ? key : null;
}

/** Which amount bands route through a given stage — shown on each committee page. */
export function tiersUsingStage(roleKey: string) {
  return APPROVAL_TIERS.filter((tier) => (tier.roles as readonly string[]).includes(roleKey));
}
