import ExcelJS from "exceljs";
import type { Dataset, WritingDoc } from "./gather";
import { resultsPdf, writingPdf } from "./pdf";

export type ExportFormat = "csv" | "json" | "xlsx" | "doc" | "pdf";

export interface ExportFile {
  filename: string;
  mime: string;
  body: Buffer | string;
}

const MIME: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  json: "application/json; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  doc: "application/msword",
  pdf: "application/pdf"
};

const EXT: Record<ExportFormat, string> = {
  csv: "csv",
  json: "json",
  xlsx: "xlsx",
  doc: "doc",
  pdf: "pdf"
};

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "export"
  );
}

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
    d.getMinutes()
  )}`;
}

function filenameFor(base: string, format: ExportFormat): string {
  return `${slug(base)}-${stamp()}.${EXT[format]}`;
}

function csvCell(value: string | number | null): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(columns: string[], rows: (string | number | null)[][]): string {
  const lines = [columns.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}`;
}

async function toXlsx(sheetName: string, columns: string[], rows: (string | number | null)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ZiyoMock";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 28) || "Sheet1");

  sheet.addRow(columns);
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  header.alignment = { vertical: "middle" };

  for (const row of rows) sheet.addRow(row);

  sheet.columns.forEach((column, index) => {
    let max = columns[index]?.length ?? 10;
    for (const row of rows) {
      const cell = row[index];
      const len = cell === null || cell === undefined ? 0 : String(cell).length;
      if (len > max) max = len;
    }
    column.width = Math.min(60, Math.max(10, max + 2));
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function htmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wordDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${htmlEscape(
    title
  )}</title><style>
body{font-family:Calibri,Arial,sans-serif;color:#0f1a30;font-size:11pt;}
h1{font-size:18pt;margin:0 0 2pt;color:#101a30;}
.meta{color:#5a6478;font-size:10pt;margin:0 0 14pt;}
table{border-collapse:collapse;width:100%;font-size:9.5pt;}
th{background:#2563EB;color:#fff;text-align:left;padding:6px 8px;border:1px solid #2563EB;}
td{padding:5px 8px;border:1px solid #d7dbe6;vertical-align:top;}
tr:nth-child(even) td{background:#f4f7fe;}
.cand{font-size:13pt;font-weight:700;margin:18pt 0 1pt;color:#101a30;}
.cmeta{color:#5a6478;font-size:9.5pt;margin:0 0 6pt;}
.task{font-weight:700;color:#2563EB;font-size:11pt;margin:10pt 0 2pt;}
.prompt{font-style:italic;color:#5a6478;margin:0 0 6pt;}
.essay{white-space:pre-wrap;margin:0 0 4pt;padding:8px;background:#f8fafc;border:1px solid #e6eaf2;border-radius:4px;}
</style></head><body>${bodyHtml}</body></html>`;
}

function resultsWordBody(dataset: Dataset): string {
  const head = dataset.columns.map((c) => `<th>${htmlEscape(c)}</th>`).join("");
  const rows = dataset.rows
    .map((row) => `<tr>${row.map((c) => `<td>${htmlEscape(String(c ?? ""))}</td>`).join("")}</tr>`)
    .join("");
  return `<h1>${htmlEscape(dataset.title)}</h1><p class="meta">${htmlEscape(
    dataset.scopeLabel
  )} &middot; Generated ${htmlEscape(dataset.generatedAt)} &middot; ${dataset.rows.length} attempt(s)</p><table><thead><tr>${head}</tr></thead><tbody>${rows ||
    `<tr><td colspan="${dataset.columns.length}">No submitted attempts.</td></tr>`}</tbody></table>`;
}

function writingWordBody(scopeLabel: string, docs: WritingDoc[]): string {
  if (docs.length === 0) {
    return `<h1>Writing Answers</h1><p class="meta">${htmlEscape(
      scopeLabel
    )}</p><p>No writing submissions found.</p>`;
  }
  const blocks = docs
    .map((entry, index) => {
      const tasks = entry.tasks
        .map(
          (task) =>
            `<div class="task">Task ${task.number} &middot; ${task.wordCount} words${
              task.band !== null ? ` &middot; band ${task.band.toFixed(1)}` : ""
            }</div><div class="prompt">${htmlEscape(task.prompt)}</div><div class="essay">${htmlEscape(
              task.essay || "No response."
            )}</div>`
        )
        .join("");
      const brk = index < docs.length - 1 ? ' style="page-break-after:always"' : "";
      return `<div${brk}><div class="cand">${htmlEscape(entry.candidate)}</div><div class="cmeta">${htmlEscape(
        entry.email
      )} &middot; ${htmlEscape(entry.mock)} &middot; ${htmlEscape(entry.submittedAt)} &middot; Writing band ${htmlEscape(
        entry.overallWriting
      )}${entry.group ? ` &middot; ${htmlEscape(entry.group)}` : ""}</div>${tasks}</div>`;
    })
    .join("");
  return `<h1>Writing Answers</h1><p class="meta">${htmlEscape(scopeLabel)} &middot; ${docs.length} submission(s)</p>${blocks}`;
}

function writingTable(docs: WritingDoc[]): {
  columns: string[];
  rows: (string | number | null)[][];
  objects: Record<string, string | number | null>[];
} {
  const columns = ["Candidate", "Email", "Group(s)", "Mock", "Submitted", "Task", "Words", "Band", "Answer"];
  const rows: (string | number | null)[][] = [];
  const objects: Record<string, string | number | null>[] = [];
  for (const doc of docs) {
    for (const task of doc.tasks) {
      const row: (string | number | null)[] = [
        doc.candidate,
        doc.email,
        doc.group,
        doc.mock,
        doc.submittedAt,
        `Task ${task.number}`,
        task.wordCount,
        task.band !== null ? task.band.toFixed(1) : "",
        task.essay
      ];
      rows.push(row);
      objects.push(Object.fromEntries(columns.map((c, i) => [c, row[i] ?? ""])));
    }
  }
  return { columns, rows, objects };
}

export async function buildResultsExport(
  format: ExportFormat,
  dataset: Dataset,
  base: string
): Promise<ExportFile> {
  const filename = filenameFor(base, format);
  const mime = MIME[format];
  switch (format) {
    case "csv":
      return { filename, mime, body: toCsv(dataset.columns, dataset.rows) };
    case "json":
      return {
        filename,
        mime,
        body: JSON.stringify(
          { title: dataset.title, scope: dataset.scopeLabel, generatedAt: dataset.generatedAt, results: dataset.objects },
          null,
          2
        )
      };
    case "xlsx":
      return { filename, mime, body: await toXlsx("Results", dataset.columns, dataset.rows) };
    case "doc":
      return { filename, mime, body: wordDocument(dataset.title, resultsWordBody(dataset)) };
    case "pdf":
      return { filename, mime, body: await resultsPdf(dataset) };
  }
}

export async function buildWritingExport(
  format: ExportFormat,
  scopeLabel: string,
  docs: WritingDoc[],
  base: string
): Promise<ExportFile> {
  const filename = filenameFor(base, format);
  const mime = MIME[format];
  const table = writingTable(docs);
  switch (format) {
    case "csv":
      return { filename, mime, body: toCsv(table.columns, table.rows) };
    case "json":
      return {
        filename,
        mime,
        body: JSON.stringify({ scope: scopeLabel, submissions: docs }, null, 2)
      };
    case "xlsx":
      return { filename, mime, body: await toXlsx("Writing", table.columns, table.rows) };
    case "doc":
      return { filename, mime, body: wordDocument("Writing Answers", writingWordBody(scopeLabel, docs)) };
    case "pdf":
      return { filename, mime, body: await writingPdf(scopeLabel, docs) };
  }
}

export function isExportFormat(value: string): value is ExportFormat {
  return value === "csv" || value === "json" || value === "xlsx" || value === "doc" || value === "pdf";
}
