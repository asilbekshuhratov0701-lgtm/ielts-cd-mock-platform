export const MODULE_ORDER = ["listening", "reading", "writing"] as const;

export function moduleRank(module: string): number {
  const i = MODULE_ORDER.indexOf(module as (typeof MODULE_ORDER)[number]);
  return i === -1 ? MODULE_ORDER.length : i;
}

/**
 * A candidate gets one attempt per mock. They may retake only if an admin
 * (re)assigned the mock to them after their last completed attempt.
 */
export function isMockCompleted(
  lastSubmittedAt: Date | null | undefined,
  latestAssignmentAt: Date | null | undefined
): boolean {
  if (!lastSubmittedAt) return false;
  if (!latestAssignmentAt) return true;
  return latestAssignmentAt <= lastSubmittedAt;
}
