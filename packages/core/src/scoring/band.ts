import type { BandConversionTable, WritingCriteria } from "../types";

export function roundToHalfBand(value: number): number {
  return Math.round(value * 2) / 2;
}

export function bandFromRaw(table: BandConversionTable, rawCorrect: number): number {
  const raw = Math.max(0, Math.min(40, Math.round(rawCorrect)));
  return table[raw] ?? 0;
}

export function writingTaskBand(criteria: WritingCriteria): number {
  const sum =
    criteria.taskResponse +
    criteria.coherenceCohesion +
    criteria.lexicalResource +
    criteria.grammaticalRange;
  return roundToHalfBand(sum / 4);
}

export function overallWritingBand(task1: number, task2: number, task2Weight = 2): number {
  return roundToHalfBand((task1 + task2 * task2Weight) / (1 + task2Weight));
}

export function overallBand(listening: number, reading: number, writing: number): number {
  return roundToHalfBand((listening + reading + writing) / 3);
}
