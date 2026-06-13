import type { BandConversionTable } from "../types";

export interface BandThreshold {
  minRaw: number;
  band: number;
}

export const LISTENING_THRESHOLDS: BandThreshold[] = [
  { minRaw: 39, band: 9 },
  { minRaw: 37, band: 8.5 },
  { minRaw: 35, band: 8 },
  { minRaw: 32, band: 7.5 },
  { minRaw: 30, band: 7 },
  { minRaw: 26, band: 6.5 },
  { minRaw: 23, band: 6 },
  { minRaw: 18, band: 5.5 },
  { minRaw: 16, band: 5 },
  { minRaw: 13, band: 4.5 },
  { minRaw: 11, band: 4 },
  { minRaw: 8, band: 3.5 },
  { minRaw: 6, band: 3 },
  { minRaw: 4, band: 2.5 },
  { minRaw: 3, band: 2 },
  { minRaw: 2, band: 1.5 },
  { minRaw: 1, band: 1 },
  { minRaw: 0, band: 0 }
];

export const ACADEMIC_READING_THRESHOLDS: BandThreshold[] = [
  { minRaw: 39, band: 9 },
  { minRaw: 37, band: 8.5 },
  { minRaw: 35, band: 8 },
  { minRaw: 33, band: 7.5 },
  { minRaw: 30, band: 7 },
  { minRaw: 27, band: 6.5 },
  { minRaw: 23, band: 6 },
  { minRaw: 19, band: 5.5 },
  { minRaw: 15, band: 5 },
  { minRaw: 13, band: 4.5 },
  { minRaw: 10, band: 4 },
  { minRaw: 8, band: 3.5 },
  { minRaw: 6, band: 3 },
  { minRaw: 4, band: 2.5 },
  { minRaw: 3, band: 2 },
  { minRaw: 2, band: 1.5 },
  { minRaw: 1, band: 1 },
  { minRaw: 0, band: 0 }
];

export function buildTable(thresholds: BandThreshold[]): BandConversionTable {
  const sorted = [...thresholds].sort((a, b) => b.minRaw - a.minRaw);
  const table: BandConversionTable = {};
  for (let raw = 0; raw <= 40; raw++) {
    const match = sorted.find((t) => raw >= t.minRaw);
    table[raw] = match ? match.band : 0;
  }
  return table;
}

export const DEFAULT_LISTENING_TABLE: BandConversionTable = buildTable(LISTENING_THRESHOLDS);
export const DEFAULT_ACADEMIC_READING_TABLE: BandConversionTable = buildTable(
  ACADEMIC_READING_THRESHOLDS
);
