export const COMMITTEE_ROLES = [
  ["BRANCH_AA", "Branch AA"], ["BRANCH_SENIOR_AO", "Branch Senior AO"],
  ["BRANCH_BOOKKEEPER", "Branch Bookkeeper"], ["BRANCH_CASHIER", "Branch Cashier"],
  ["BRANCH_TL", "Branch Team Leader"], ["BRANCH_MA", "Branch MA"],
  ["AREA_TL", "Area Team Leader"], ["HEAD_OFFICE_TL", "Head Office Team Leader"],
  ["REMEDIAL", "Remedial"], ["ACCOUNTING", "Accounting"],
  ["HEAD_OFFICE_CASHIER", "Head Office Cashier"], ["CMG", "CMG"],
  ["FINANCE_MANAGER", "Finance Manager"], ["PRESIDENT", "President"]
] as const;

export const APPROVAL_TIERS = [
  { key: "LOW", label: "Up to ₱30,000", min: 0, max: 30000, roles: ["BRANCH_BOOKKEEPER", "BRANCH_TL"] },
  { key: "MID", label: "₱30,000.01–₱90,000", min: 30000.01, max: 90000, roles: ["BRANCH_BOOKKEEPER", "BRANCH_TL", "AREA_TL", "REMEDIAL", "HEAD_OFFICE_TL"] },
  { key: "HIGH", label: "Above ₱90,000", min: 90000.01, max: null, roles: ["BRANCH_BOOKKEEPER", "BRANCH_TL", "AREA_TL", "HEAD_OFFICE_TL", "ACCOUNTING", "CMG", "FINANCE_MANAGER"] }
] as const;

export function committeeRoleLabel(roleKey: string) { return COMMITTEE_ROLES.find(([key]) => key === roleKey)?.[1] || roleKey.replaceAll("_", " "); }

export function approvalStageLimit(amount: number) {
  return APPROVAL_TIERS.find((tier) => amount >= tier.min && (tier.max === null || amount <= tier.max))?.roles.length ?? 0;
}
