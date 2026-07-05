import {
  bandFromRaw,
  roundToHalfBand,
  DEFAULT_LISTENING_TABLE,
  DEFAULT_ACADEMIC_READING_TABLE
} from "@ielts/core";

export function skillBand(module: string, raw: number, total: number): number | null {
  if (module === "writing") return null;
  if (total <= 0) return null;
  const table = module === "listening" ? DEFAULT_LISTENING_TABLE : DEFAULT_ACADEMIC_READING_TABLE;
  const equivalent = total === 40 ? raw : Math.round((raw / total) * 40);
  return bandFromRaw(table, equivalent);
}

export function overallBandFrom(bands: (number | null)[]): number | null {
  const present = bands.filter((b): b is number => b !== null);
  if (present.length === 0) return null;
  return roundToHalfBand(present.reduce((s, b) => s + b, 0) / present.length);
}

export function bandLabel(band: number | null): string {
  return band === null ? "—" : band.toFixed(1);
}
