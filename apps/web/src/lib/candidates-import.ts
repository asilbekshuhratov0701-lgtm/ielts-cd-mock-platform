import ExcelJS from "exceljs";

export interface ImportRow {
  email: string;
  name?: string;
  password?: string;
  group?: string;
  phone?: string;
  country?: string;
  targetBand?: number;
}

const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  email: "email",
  "e-mail": "email",
  mail: "email",
  name: "name",
  "full name": "name",
  fullname: "name",
  candidate: "name",
  "candidate name": "name",
  password: "password",
  pass: "password",
  pwd: "password",
  group: "group",
  "group name": "group",
  batch: "group",
  class: "group",
  phone: "phone",
  "phone number": "phone",
  tel: "phone",
  mobile: "phone",
  country: "country",
  target: "targetBand",
  "target band": "targetBand",
  targetband: "targetBand",
  band: "targetBand"
};

function normalizeKey(raw: string): keyof ImportRow | null {
  return HEADER_ALIASES[raw.trim().toLowerCase()] ?? null;
}

function toRow(record: Record<string, unknown>): ImportRow | null {
  const value = (field: keyof ImportRow): string => {
    for (const [rawKey, raw] of Object.entries(record)) {
      if (normalizeKey(rawKey) === field) {
        const str = raw === null || raw === undefined ? "" : String(raw).trim();
        if (str !== "") return str;
      }
    }
    return "";
  };

  const email = value("email").toLowerCase();
  if (!email) return null;

  const row: ImportRow = { email };
  const name = value("name");
  if (name) row.name = name;
  const password = value("password");
  if (password) row.password = password;
  const group = value("group");
  if (group) row.group = group;
  const phone = value("phone");
  if (phone) row.phone = phone;
  const country = value("country");
  if (country) row.country = country;
  const targetRaw = value("targetBand");
  const target = Number(targetRaw);
  if (targetRaw && Number.isFinite(target)) row.targetBand = target;
  return row;
}

function detectDelimiter(headerLine: string): string {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const count = headerLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function csvToMatrix(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function parseCsv(text: string): Record<string, string>[] {
  const trimmed = text.replace(/^﻿/, "");
  const firstLine = trimmed.split(/\r?\n/, 1)[0] ?? "";
  const matrix = csvToMatrix(trimmed, detectDelimiter(firstLine));
  if (matrix.length === 0) return [];
  const headers = (matrix[0] ?? []).map((h) => h.trim());
  return matrix.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = cells[i] ?? "";
    });
    return rec;
  });
}

function parseJson(text: string): Record<string, unknown>[] {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const holder = data as Record<string, unknown>;
    for (const key of ["candidates", "rows", "users", "data"]) {
      if (Array.isArray(holder[key])) return holder[key] as Record<string, unknown>[];
    }
  }
  return [];
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const obj = value as unknown as Record<string, unknown>;
    if ("text" in obj && typeof obj.text === "string") return obj.text;
    if ("result" in obj) return String(obj.result ?? "");
    if ("richText" in obj && Array.isArray(obj.richText)) {
      return (obj.richText as { text?: string }[]).map((r) => r.text ?? "").join("");
    }
    if ("hyperlink" in obj) return String(obj.text ?? obj.hyperlink ?? "");
    if (value instanceof Date) return value.toISOString();
  }
  return String(value);
}

async function parseXlsx(buffer: Buffer): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, col) => {
    headers[col] = cellText(cell.value).trim();
  });
  const records: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const rec: Record<string, string> = {};
    row.eachCell((cell, col) => {
      const header = headers[col];
      if (header) rec[header] = cellText(cell.value);
    });
    if (Object.values(rec).some((v) => v.trim() !== "")) records.push(rec);
  });
  return records;
}

export async function parseCandidateFile(file: File): Promise<ImportRow[]> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  let records: Record<string, unknown>[];
  if (name.endsWith(".json")) {
    records = parseJson(buffer.toString("utf8"));
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    records = await parseXlsx(buffer);
  } else {
    records = parseCsv(buffer.toString("utf8"));
  }
  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    const row = toRow(record);
    if (!row || seen.has(row.email)) continue;
    seen.add(row.email);
    rows.push(row);
  }
  return rows;
}
