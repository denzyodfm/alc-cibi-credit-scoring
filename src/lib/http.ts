import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/**
 * Turns a schema failure into a 400 with the offending field paths.
 *
 * Routes previously called `schema.parse()`, whose thrown ZodError surfaced as an opaque 500 —
 * indistinguishable from a genuine server fault in the logs, and useless to the caller.
 */
export function badRequest(error: ZodError, message = "Invalid request body") {
  const fields = error.issues.map((issue) => issue.path.join(".")).filter(Boolean);
  return NextResponse.json({ error: message, fields: [...new Set(fields)] }, { status: 400 });
}
