/**
 * Every date the platform shows is rendered in Uzbekistan time, whatever the
 * server's own clock is set to. Hosts run in UTC, so `toLocaleString()` and
 * `getHours()` render five hours behind Tashkent once deployed — always format
 * through this module instead, and bucket by `dayKey`/`monthKey` rather than
 * `toISOString().slice(0, 10)`, which is a UTC day.
 */
export const APP_TIME_ZONE = "Asia/Tashkent";
export const APP_TIME_ZONE_LABEL = "GMT+5";

type DateLike = Date | string | number | null | undefined;

function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hour12: false
});

export interface ZonedParts {
  year: number;
  /** 1-12, the way people write months rather than the 0-11 Date uses. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday, matching Date#getDay. */
  weekday: number;
}

export function zonedParts(value: DateLike): ZonedParts | null {
  const date = toDate(value);
  if (!date) return null;
  const found: Record<string, string> = {};
  for (const part of partsFormat.formatToParts(date)) found[part.type] = part.value;
  const hour = Number(found.hour);
  return {
    year: Number(found.year),
    month: Number(found.month),
    day: Number(found.day),
    hour: hour === 24 ? 0 : hour,
    minute: Number(found.minute),
    second: Number(found.second),
    weekday: Math.max(0, WEEKDAYS_SHORT.indexOf(found.weekday ?? ""))
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Uzbekistan calendar date as YYYY-MM-DD — the key to bucket by, never the UTC one. */
export function dayKey(value: DateLike): string {
  const p = zonedParts(value);
  return p ? `${p.year}-${pad(p.month)}-${pad(p.day)}` : "";
}

/** Uzbekistan calendar month as YYYY-MM. */
export function monthKey(value: DateLike): string {
  const p = zonedParts(value);
  return p ? `${p.year}-${pad(p.month)}` : "";
}

/** 09 Sep 2026 */
export function formatDate(value: DateLike, fallback = "—"): string {
  const p = zonedParts(value);
  return p ? `${pad(p.day)} ${MONTHS_SHORT[p.month - 1]} ${p.year}` : fallback;
}

/** 09 Sep 2026, 22:45 */
export function formatDateTime(value: DateLike, fallback = "—"): string {
  const p = zonedParts(value);
  return p
    ? `${pad(p.day)} ${MONTHS_SHORT[p.month - 1]} ${p.year}, ${pad(p.hour)}:${pad(p.minute)}`
    : fallback;
}

/** 09 September 2026 */
export function formatLongDate(value: DateLike, fallback = "—"): string {
  const p = zonedParts(value);
  return p ? `${pad(p.day)} ${MONTHS_LONG[p.month - 1]} ${p.year}` : fallback;
}

/** 9 Sep — for chart axes, where space is tight. */
export function formatDayMonth(value: DateLike, fallback = "—"): string {
  const p = zonedParts(value);
  return p ? `${p.day} ${MONTHS_SHORT[p.month - 1]}` : fallback;
}

/** Sep */
export function formatMonthShort(value: DateLike, fallback = ""): string {
  const p = zonedParts(value);
  return p ? (MONTHS_SHORT[p.month - 1] ?? fallback) : fallback;
}

/** Mon */
export function formatWeekdayShort(value: DateLike, fallback = ""): string {
  const p = zonedParts(value);
  return p ? (WEEKDAYS_SHORT[p.weekday] ?? fallback) : fallback;
}

/** 09 */
export function formatDayOfMonth(value: DateLike, fallback = ""): string {
  const p = zonedParts(value);
  return p ? pad(p.day) : fallback;
}

/** 2026-09-09 22:45 — the spreadsheet-sortable form used across the exports. */
export function formatSheetDateTime(value: DateLike, fallback = ""): string {
  const p = zonedParts(value);
  return p ? `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}` : fallback;
}

/** 20260909-2245 — for download filenames. */
export function fileStamp(value: DateLike = new Date()): string {
  const p = zonedParts(value) ?? zonedParts(new Date())!;
  return `${p.year}${pad(p.month)}${pad(p.day)}-${pad(p.hour)}${pad(p.minute)}`;
}

export function monthLabel(month: number): string {
  return MONTHS_SHORT[(((month - 1) % 12) + 12) % 12] ?? "";
}

/**
 * The last `count` Uzbekistan calendar months, oldest first. Built from the
 * zone's own year/month numbers so a deployment running in UTC does not roll
 * the series over five hours late.
 */
export function recentMonths(count: number, now: DateLike = new Date()) {
  const p = zonedParts(now) ?? zonedParts(new Date())!;
  const out: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    let month = p.month - i;
    let year = p.year;
    while (month < 1) {
      month += 12;
      year -= 1;
    }
    out.push({ key: `${year}-${pad(month)}`, label: monthLabel(month) });
  }
  return out;
}

/**
 * The last `count` Uzbekistan calendar days, oldest first. The walk happens on a
 * UTC-midnight anchor because that is plain calendar arithmetic — no instant is
 * being converted, so no offset can creep in.
 */
export function recentDays(count: number, now: DateLike = new Date()) {
  const p = zonedParts(now) ?? zonedParts(new Date())!;
  const anchor = Date.UTC(p.year, p.month - 1, p.day);
  const out: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(anchor - i * 86_400_000);
    out.push({
      key: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
      label: `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`
    });
  }
  return out;
}
