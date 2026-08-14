/**
 * Fixed-window rate limiter kept in process memory.
 *
 * Good enough for a single-instance deployment, which is how this app runs. If it is ever
 * scaled to multiple Node processes the counters stop being shared and this must move to
 * the database or a cache shared between instances.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Drops expired windows so the map cannot grow without bound. */
function sweep(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (windows.size > 5000) sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/** Clears a key's window, so a successful login does not leave failed attempts counting against the user. */
export function resetRateLimit(key: string) {
  windows.delete(key);
}

/**
 * Client address from the proxy headers Next.js passes through, or null when it cannot be
 * determined. Returning null matters: served directly (no reverse proxy) every request would
 * otherwise collapse onto one shared key, and a single person's failed logins would lock out
 * everyone. Callers must skip per-address limiting when this is null.
 */
export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || null;
}
