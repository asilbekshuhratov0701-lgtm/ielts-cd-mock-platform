/**
 * Scheduled finalizer (stub) — the server-authoritative timer enforcement.
 * Runs every ~30-60s: finds IN_PROGRESS section attempts whose `deadlineAt` has passed
 * and auto-submits them (idempotently), then triggers scoring. This is what makes
 * "auto submit on timeout" reliable on serverless (no live in-memory timers).
 */
export async function finalizeExpiredSessions(): Promise<void> {
  throw new Error("Not implemented: finalize expired sessions");
}
