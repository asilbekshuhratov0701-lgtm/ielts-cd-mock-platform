import ExcelJS from "exceljs";
import type { Dataset, WritingDoc } from "./gather";
import { groupSummaryDataset, type GroupSummary } from "./group-summary";
import { candidateDetailDataset, type CandidateDetail } from "./candidate-detail";
import { candidateDetailPdf, groupSummaryPdf, resultsPdf, writingPdf } from "./pdf";

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
  let s = value === null || value === undefined ? "" : String(value);
  // Neutralize spreadsheet formula injection: a cell beginning with = + - @ (or
  // a leading tab/CR) is treated as a formula by Excel/LibreOffice. Prefix a
  // single quote so candidate-authored text (essays, names) can't execute.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(columns: string[], rows: (string | number | null)[][]): string {
  const lines = [columns.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return `\ufeff${lines.join("\r\n")}`;
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
.brand{text-align:center;font-size:20pt;font-weight:700;color:#2563EB;margin:0 0 4pt;}
.heading{text-align:center;font-size:13pt;font-weight:700;color:#101a30;margin:0 0 12pt;}
table.meta{border-collapse:collapse;width:100%;background:#f6f8fe;margin:0 0 14pt;}
table.meta td{border:none;padding:7px 10px;font-size:10pt;}
.mlabel{color:#5a6478;}
table.scores{border-collapse:collapse;width:100%;font-size:10pt;}
table.scores th{background:#2563EB;color:#fff;text-align:left;padding:7px 8px;border:1px solid #2563EB;}
table.scores th.num,table.scores td.num{text-align:center;}
table.scores td{padding:6px 8px;border:1px solid #d7dbe6;}
table.scores td.pos{color:#5a6478;}
tr:nth-child(even) td{background:#f8fafd;}
.pill{display:inline-block;min-width:34px;padding:3px 9px;border-radius:9pt;background:#e8edfe;color:#1c3f99;font-weight:700;}
.pill-strong{background:#2563EB;color:#fff;font-size:11pt;}
.pill-empty{background:#f0f2f6;color:#8b93a5;font-weight:400;}
.gen{color:#8b93a5;font-size:8pt;margin-top:12pt;}
td.ok{color:#0b7a4b;font-weight:700;}
td.bad{color:#b82929;font-weight:700;}
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

function groupSummaryWordBody(summary: GroupSummary): string {
  const pill = (band: number | null, strong: boolean): string => {
    const label = band === null ? "&mdash;" : band.toFixed(1);
    const cls = band === null ? "pill pill-empty" : strong ? "pill pill-strong" : "pill";
    return `<td class="num"><span class="${cls}">${label}</span></td>`;
  };
  const rows = summary.rows
    .map(
      (r) =>
        `<tr><td class="pos">${String(r.position).padStart(2, "0")}</td><td>${htmlEscape(
          r.candidate
        )}</td>${pill(r.listening, false)}${pill(r.reading, false)}${pill(r.writing, false)}${pill(
          r.speaking,
          false
        )}${pill(r.overall, true)}</tr>`
    )
    .join("");

  return `<div class="brand">${htmlEscape(summary.brand)}</div>
<div class="heading">${htmlEscape(summary.heading)} &mdash; ${htmlEscape(summary.mockTitle)}</div>
<table class="meta"><tr>
<td><span class="mlabel">Group:</span> <strong>${htmlEscape(summary.groupName)}</strong></td>
<td><span class="mlabel">Date:</span> <strong>${htmlEscape(summary.date)}</strong></td>
<td><span class="mlabel">Candidates:</span> <strong>${summary.candidateCount}</strong></td>
</tr></table>
<table class="scores"><thead><tr><th>#</th><th>Candidate</th><th class="num">Listening</th><th class="num">Reading</th><th class="num">Writing</th><th class="num">Speaking</th><th class="num overall">Overall</th></tr></thead><tbody>${
    rows || `<tr><td colspan="7">No submitted results for this group yet.</td></tr>`
  }</tbody></table>
<p class="gen">Generated ${htmlEscape(summary.generatedAt)}</p>`;
}

export async function buildGroupSummaryExport(
  format: ExportFormat,
  summary: GroupSummary,
  base: string
): Promise<ExportFile> {
  const filename = filenameFor(base, format);
  const mime = MIME[format];
  const dataset = groupSummaryDataset(summary);
  switch (format) {
    case "csv":
      return { filename, mime, body: toCsv(dataset.columns, dataset.rows) };
    case "json":
      return {
        filename,
        mime,
        body: JSON.stringify(
          {
            heading: summary.heading,
            mock: summary.mockTitle,
            group: summary.groupName,
            date: summary.date,
            candidates: summary.candidateCount,
            generatedAt: summary.generatedAt,
            results: dataset.objects
          },
          null,
          2
        )
      };
    case "xlsx":
      return { filename, mime, body: await toXlsx("Group results", dataset.columns, dataset.rows) };
    case "doc":
      return {
        filename,
        mime,
        body: wordDocument(dataset.title, groupSummaryWordBody(summary))
      };
    case "pdf":
      return { filename, mime, body: await groupSummaryPdf(summary) };
  }
}

function candidateDetailWordBody(detail: CandidateDetail): string {
  const pill = (band: number | null, strong: boolean) =>
    `<span class="${band === null ? "pill pill-empty" : strong ? "pill pill-strong" : "pill"}">${
      band === null ? "&mdash;" : band.toFixed(1)
    }</span>`;

  const summary = `<table class="meta"><tr>
<td>Listening<br>${pill(detail.listening, false)}</td>
<td>Reading<br>${pill(detail.reading, false)}</td>
<td>Writing<br>${pill(detail.writing, false)}</td>
<td>Speaking<br>${pill(detail.speaking, false)}</td>
<td>Overall<br>${pill(detail.overall, true)}</td>
</tr></table>`;

  const sections = detail.skills
    .map((skill) => {
      const heading =
        skill.raw !== null && skill.total !== null
          ? `${skill.label} &mdash; ${skill.raw}/${skill.total} correct &mdash; band ${
              skill.band === null ? "&mdash;" : skill.band.toFixed(1)
            }`
          : `${skill.label} &mdash; band ${skill.band === null ? "&mdash;" : skill.band.toFixed(1)}`;

      if (skill.writingTasks.length > 0) {
        const tasks = skill.writingTasks
          .map((task) => {
            const c = task.criteria;
            const criteria = c
              ? ` &middot; TR ${c.taskResponse} &middot; CC ${c.coherenceCohesion} &middot; LR ${c.lexicalResource} &middot; GRA ${c.grammaticalRange}`
              : "";
            return `<div class="task">Task ${task.number} &mdash; band ${
              task.band === null ? "&mdash;" : task.band.toFixed(1)
            }${criteria}</div>`;
          })
          .join("");
        const feedback = skill.feedback
          ? `<div class="prompt">${htmlEscape(skill.feedback)}</div>`
          : "";
        return `<div class="cand">${heading}</div>${tasks}${feedback}`;
      }

      if (skill.answers.length === 0) return `<div class="cand">${heading}</div>`;

      const rows = skill.answers
        .map(
          (a) =>
            `<tr><td>${htmlEscape(a.number)}</td><td>${htmlEscape(
              a.candidate
            )}</td><td>${htmlEscape(a.accepted)}</td><td class="${
              a.correct ? "ok" : "bad"
            }">${a.correct ? "Correct" : "Wrong"}</td></tr>`
        )
        .join("");
      return `<div class="cand">${heading}</div><table class="scores"><thead><tr><th>Q</th><th>Candidate answer</th><th>Accepted</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>`;
    })
    .join("");

  return `<div class="brand">${htmlEscape(detail.brand)}</div>
<div class="heading">${htmlEscape(detail.heading)}</div>
<table class="meta"><tr>
<td><span class="mlabel">Candidate:</span> <strong>${htmlEscape(detail.candidate)}</strong></td>
<td><span class="mlabel">Mock:</span> <strong>${htmlEscape(detail.mockTitle)}</strong></td>
</tr><tr>
<td><span class="mlabel">Group:</span> <strong>${htmlEscape(detail.groupName || "—")}</strong></td>
<td><span class="mlabel">Date:</span> <strong>${htmlEscape(detail.date)}</strong></td>
</tr></table>
${summary}${sections}
<p class="gen">Generated ${htmlEscape(detail.generatedAt)}</p>`;
}

export async function buildCandidateDetailExport(
  format: ExportFormat,
  detail: CandidateDetail,
  base: string
): Promise<ExportFile> {
  const filename = filenameFor(base, format);
  const mime = MIME[format];
  const dataset = candidateDetailDataset(detail);
  switch (format) {
    case "csv":
      return { filename, mime, body: toCsv(dataset.columns, dataset.rows) };
    case "json":
      return { filename, mime, body: JSON.stringify(detail, null, 2) };
    case "xlsx":
      return { filename, mime, body: await toXlsx("Detail", dataset.columns, dataset.rows) };
    case "doc":
      return { filename, mime, body: wordDocument(dataset.title, candidateDetailWordBody(detail)) };
    case "pdf":
      return { filename, mime, body: await candidateDetailPdf(detail) };
  }
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
