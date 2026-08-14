import { Prisma } from "@prisma/client";

/**
 * Columns a client may never set through the generic loan save route, no matter which model
 * they appear on. Identity and audit columns are owned by the database; the applicant photo is
 * owned by /api/loans/[id]/photo, which enforces a MIME whitelist and size cap that this route
 * cannot re-check.
 */
const NEVER_WRITABLE = new Set(["id", "loanApplicationId", "createdAt", "updatedAt", "photoDataUrl", "photoMimeType"]);

const cache = new Map<string, Set<string>>();

/** Scalar columns of a Prisma model that a client is allowed to write, derived from the schema itself. */
export function writableFields(modelName: string): Set<string> {
  const cached = cache.get(modelName);
  if (cached) return cached;

  const model = Prisma.dmmf.datamodel.models.find((item) => item.name === modelName);
  if (!model) throw new Error(`Unknown Prisma model: ${modelName}`);

  const allowed = new Set(
    model.fields
      .filter((field) => field.kind === "scalar" && !field.isReadOnly && !NEVER_WRITABLE.has(field.name))
      .map((field) => field.name)
  );
  cache.set(modelName, allowed);
  return allowed;
}

/**
 * Drops any key the model does not accept. Without this the route spreads client-supplied keys
 * straight into Prisma, letting a caller set columns the form never exposes.
 *
 * Dropping rather than rejecting is deliberate. Rejecting would fail an entire ~200-field save
 * over one stray key, and the 400-vs-200 difference would tell a caller which columns exist.
 * Rejected keys are reported through `dropped` instead, so real client bugs stay visible to us
 * without leaking the schema to the caller.
 */
export function pickWritable(modelName: string, input: Record<string, unknown> = {}, dropped: string[] = []) {
  const allowed = writableFields(modelName);
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (allowed.has(key)) kept[key] = value;
    else dropped.push(`${modelName}.${key}`);
  }
  return kept;
}

export function pickWritableRows(modelName: string, rows: Record<string, unknown>[] = [], dropped: string[] = []) {
  return (rows ?? []).map((row) => pickWritable(modelName, row, dropped));
}
