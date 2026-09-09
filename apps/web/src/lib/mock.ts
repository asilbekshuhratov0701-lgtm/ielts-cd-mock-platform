export const MODULE_ORDER = ["listening", "reading", "writing"] as const;

export const MODULE_LABEL: Record<string, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing"
};

export const AUDIO_TIMER_GRACE_SEC = 60;

export function audioTimedSecFor(
  module: string,
  audioDurationSec: number | null | undefined
): number | null {
  if (module !== "listening") return null;
  if (!audioDurationSec || audioDurationSec <= 0) return null;
  return Math.ceil(audioDurationSec);
}

export function durationSecFor(
  module: string,
  timeLimitMin: number | null,
  audioDurationSec?: number | null
): number {
  const audio = audioTimedSecFor(module, audioDurationSec);
  if (audio !== null) return audio;
  if (timeLimitMin && timeLimitMin > 0) return timeLimitMin * 60;
  if (module === "listening") return 2040;
  return 3600;
}

/**
 * The span the server writes into `deadlineAt`. An audio-timed section gets a
 * short grace on top of the recording so a blocked autoplay or a stalled buffer
 * cannot swallow the last answers — the candidate never sees it, because the
 * runner submits when the audio ends.
 */
export function attemptDurationSecFor(
  module: string,
  timeLimitMin: number | null,
  audioDurationSec?: number | null
): number {
  const audio = audioTimedSecFor(module, audioDurationSec);
  if (audio !== null) return audio + AUDIO_TIMER_GRACE_SEC;
  return durationSecFor(module, timeLimitMin, audioDurationSec);
}

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

export function formatMinutesSeconds(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
