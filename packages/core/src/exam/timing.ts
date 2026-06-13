export interface SectionTiming {
  startedAt: Date;
  durationSec: number;
  deadlineAt: Date;
}

export function computeDeadline(startedAt: Date, durationSec: number): Date {
  return new Date(startedAt.getTime() + durationSec * 1000);
}

export function remainingSeconds(deadlineAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((deadlineAt.getTime() - now.getTime()) / 1000));
}

export function isExpired(deadlineAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= deadlineAt.getTime();
}

export function deriveAudioPositionSec(startedAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
}
