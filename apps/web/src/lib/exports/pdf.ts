import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Dataset, WritingDoc } from "./gather";
import type { GroupSummary } from "./group-summary";
import type { CandidateDetail } from "./candidate-detail";

const BRAND = rgb(0.145, 0.388, 0.922);
const INK = rgb(0.06, 0.1, 0.19);
const MUTED = rgb(0.4, 0.44, 0.52);
const LINE = rgb(0.85, 0.87, 0.92);

function pdfSafe(text: string): string {
  return text
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[\u00A0\t]/g, " ")
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "?");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const rawLine of pdfSafe(text).split("\n")) {
    let current = "";
    for (const word of rawLine.split(/\s+/)) {
      if (word === "") continue;
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        out.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    out.push(current);
  }
  return out.length > 0 ? out : [""];
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const safe = pdfSafe(text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let cut = safe;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`.replace("…", "..."), size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}...`;
}

function pillPath(w: number, h: number): string {
  const r = h / 2;
  return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
}

export async function groupSummaryPdf(summary: GroupSummary): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [595, 842];
  const margin = 42;
  const contentWidth = pageSize[0] - margin * 2;
  const rowHeight = 26;

  const weights = [0.6, 3.4, 1, 1, 1, 1, 1.35];
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const widths = weights.map((w) => (w / totalWeight) * contentWidth);
  const columns = ["#", "Candidate", "Listening", "Reading", "Writing", "Speaking", "Overall"];

  let page = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  const centre = (text: string, size: number, f: PDFFont) =>
    margin + (contentWidth - f.widthOfTextAtSize(pdfSafe(text), size)) / 2;

  const brandSize = 20;
  page.drawText(pdfSafe(summary.brand), {
    x: centre(summary.brand, brandSize, bold),
    y: y - brandSize,
    size: brandSize,
    font: bold,
    color: BRAND
  });
  y -= brandSize + 12;

  const headingText = `${summary.heading} — ${summary.mockTitle}`;
  const headingSize = 13;
  page.drawText(truncate(headingText, bold, headingSize, contentWidth), {
    x: centre(truncate(headingText, bold, headingSize, contentWidth), headingSize, bold),
    y: y - headingSize,
    size: headingSize,
    font: bold,
    color: INK
  });
  y -= headingSize + 18;

  page.drawRectangle({
    x: margin,
    y: y - 30,
    width: contentWidth,
    height: 30,
    color: rgb(0.965, 0.973, 0.996)
  });
  const metaY = y - 20;
  const meta: [string, string][] = [
    ["Group", summary.groupName],
    ["Date", summary.date],
    ["Candidates", String(summary.candidateCount)]
  ];
  let metaX = margin + 12;
  const metaSlot = (contentWidth - 24) / meta.length;
  for (const [label, value] of meta) {
    page.drawText(pdfSafe(`${label}: `), { x: metaX, y: metaY, size: 9, font, color: MUTED });
    const labelWidth = font.widthOfTextAtSize(pdfSafe(`${label}: `), 9);
    page.drawText(truncate(value, bold, 9, metaSlot - labelWidth - 8), {
      x: metaX + labelWidth,
      y: metaY,
      size: 9,
      font: bold,
      color: INK
    });
    metaX += metaSlot;
  }
  y -= 46;

  const drawHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - rowHeight + 4,
      width: contentWidth,
      height: rowHeight,
      color: BRAND
    });
    let x = margin + 8;
    columns.forEach((col, i) => {
      const size = 8.5;
      const w = widths[i]!;
      const label = truncate(col, bold, size, w - 8);
      const cx = i >= 2 ? x + (w - bold.widthOfTextAtSize(label, size)) / 2 - 4 : x;
      page.drawText(label, {
        x: cx,
        y: y - rowHeight + 4 + (rowHeight - size * 0.72) / 2,
        size,
        font: bold,
        color: rgb(1, 1, 1)
      });
      x += w;
    });
    y -= rowHeight;
  };

  drawHeader();

  const drawPill = (
    value: number | null,
    x: number,
    slot: number,
    strong: boolean
  ) => {
    const label = value === null ? "-" : value.toFixed(1);
    const size = strong ? 10 : 9;
    const f = strong ? bold : font;
    const textWidth = f.widthOfTextAtSize(label, size);
    const pillW = Math.min(slot - 10, Math.max(textWidth + 18, 34));
    const pillH = 16;
    const pillX = x + (slot - pillW) / 2 - 4;
    const pillBottom = y - rowHeight + 4 + (rowHeight - pillH) / 2;
    const pillTop = pillBottom + pillH;

    const fill =
      value === null
        ? rgb(0.94, 0.95, 0.97)
        : strong
          ? BRAND
          : rgb(0.906, 0.929, 0.996);
    page.drawSvgPath(pillPath(pillW, pillH), { x: pillX, y: pillTop, color: fill });
    page.drawText(label, {
      x: pillX + (pillW - textWidth) / 2,
      y: pillBottom + (pillH - size * 0.72) / 2,
      size,
      font: f,
      color: value === null ? MUTED : strong ? rgb(1, 1, 1) : rgb(0.11, 0.25, 0.6)
    });
  };

  summary.rows.forEach((row, index) => {
    if (y < margin + rowHeight + 10) {
      page = doc.addPage(pageSize);
      y = pageSize[1] - margin;
      drawHeader();
    }
    if (index % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + 4,
        width: contentWidth,
        height: rowHeight,
        color: rgb(0.976, 0.98, 0.992)
      });
    }

    const textY = y - rowHeight + 4 + (rowHeight - 10 * 0.72) / 2;
    page.drawText(String(row.position).padStart(2, "0"), {
      x: margin + 8,
      y: textY,
      size: 9,
      font,
      color: MUTED
    });
    page.drawText(truncate(row.candidate, font, 10, widths[1]! - 10), {
      x: margin + widths[0]! + 8,
      y: textY,
      size: 10,
      font,
      color: INK
    });

    let x = margin + widths[0]! + widths[1]! + 8;
    const bands: (number | null)[] = [row.listening, row.reading, row.writing, row.speaking];
    bands.forEach((band, i) => {
      drawPill(band, x, widths[i + 2]!, false);
      x += widths[i + 2]!;
    });
    drawPill(row.overall, x, widths[6]!, true);

    page.drawLine({
      start: { x: margin, y: y - rowHeight + 3 },
      end: { x: margin + contentWidth, y: y - rowHeight + 3 },
      thickness: 0.5,
      color: LINE
    });
    y -= rowHeight;
  });

  if (summary.rows.length === 0) {
    page.drawText("No submitted results for this group yet.", {
      x: margin,
      y: y - 16,
      size: 10,
      font,
      color: MUTED
    });
  }

  page.drawText(pdfSafe(`Generated ${summary.generatedAt}`), {
    x: margin,
    y: margin - 16,
    size: 8,
    font,
    color: MUTED
  });

  return Buffer.from(await doc.save());
}

export async function candidateDetailPdf(detail: CandidateDetail): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [595, 842];
  const margin = 42;
  const contentWidth = pageSize[0] - margin * 2;

  let page = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  const newPage = () => {
    page = doc.addPage(pageSize);
    y = pageSize[1] - margin;
  };
  const need = (space: number) => {
    if (y - space < margin + 20) newPage();
  };
  const centre = (text: string, size: number, f: PDFFont) =>
    margin + (contentWidth - f.widthOfTextAtSize(pdfSafe(text), size)) / 2;

  page.drawText(pdfSafe(detail.brand), {
    x: centre(detail.brand, 20, bold),
    y: y - 20,
    size: 20,
    font: bold,
    color: BRAND
  });
  y -= 32;
  page.drawText(pdfSafe(detail.heading), {
    x: centre(detail.heading, 13, bold),
    y: y - 13,
    size: 13,
    font: bold,
    color: INK
  });
  y -= 30;

  page.drawRectangle({
    x: margin,
    y: y - 46,
    width: contentWidth,
    height: 46,
    color: rgb(0.965, 0.973, 0.996)
  });
  const metaLine = (label: string, value: string, lineY: number, colX: number, colW: number) => {
    page.drawText(pdfSafe(`${label}: `), { x: colX, y: lineY, size: 9, font, color: MUTED });
    const lw = font.widthOfTextAtSize(pdfSafe(`${label}: `), 9);
    page.drawText(truncate(value, bold, 9, colW - lw - 8), {
      x: colX + lw,
      y: lineY,
      size: 9,
      font: bold,
      color: INK
    });
  };
  const half = (contentWidth - 24) / 2;
  metaLine("Candidate", detail.candidate, y - 17, margin + 12, half);
  metaLine("Mock", detail.mockTitle, y - 17, margin + 12 + half, half);
  metaLine("Group", detail.groupName || "—", y - 34, margin + 12, half);
  metaLine("Date", detail.date, y - 34, margin + 12 + half, half);
  y -= 62;

  const summary: [string, number | null, boolean][] = [
    ["Listening", detail.listening, false],
    ["Reading", detail.reading, false],
    ["Writing", detail.writing, false],
    ["Speaking", detail.speaking, false],
    ["Overall", detail.overall, true]
  ];
  const slot = contentWidth / summary.length;
  summary.forEach(([label, band, strong], i) => {
    const x = margin + i * slot;
    page.drawText(label, {
      x: x + (slot - font.widthOfTextAtSize(label, 8.5)) / 2,
      y: y - 9,
      size: 8.5,
      font,
      color: MUTED
    });
    const text = band === null ? "-" : band.toFixed(1);
    const size = strong ? 15 : 13;
    const f = strong ? bold : bold;
    const tw = f.widthOfTextAtSize(text, size);
    const pillW = Math.max(tw + 24, 52);
    const pillH = 24;
    const pillX = x + (slot - pillW) / 2;
    const pillTop = y - 15;
    page.drawSvgPath(pillPath(pillW, pillH), {
      x: pillX,
      y: pillTop,
      color: band === null ? rgb(0.94, 0.95, 0.97) : strong ? BRAND : rgb(0.906, 0.929, 0.996)
    });
    page.drawText(text, {
      x: pillX + (pillW - tw) / 2,
      y: pillTop - pillH + (pillH - size * 0.72) / 2,
      size,
      font: f,
      color: band === null ? MUTED : strong ? rgb(1, 1, 1) : rgb(0.11, 0.25, 0.6)
    });
  });
  y -= 56;

  for (const skill of detail.skills) {
    need(60);
    const heading =
      skill.raw !== null && skill.total !== null
        ? `${skill.label} — ${skill.raw}/${skill.total} correct — band ${
            skill.band === null ? "-" : skill.band.toFixed(1)
          }`
        : `${skill.label} — band ${skill.band === null ? "-" : skill.band.toFixed(1)}`;
    page.drawText(truncate(heading, bold, 11, contentWidth), {
      x: margin,
      y: y - 11,
      size: 11,
      font: bold,
      color: INK
    });
    y -= 20;

    if (skill.writingTasks.length > 0) {
      for (const task of skill.writingTasks) {
        need(16);
        const c = task.criteria;
        const parts = c
          ? `TR ${c.taskResponse}  CC ${c.coherenceCohesion}  LR ${c.lexicalResource}  GRA ${c.grammaticalRange}`
          : "";
        page.drawText(
          truncate(
            `Task ${task.number} — band ${task.band === null ? "-" : task.band.toFixed(1)}   ${parts}`,
            font,
            9,
            contentWidth
          ),
          { x: margin + 8, y: y - 9, size: 9, font, color: INK }
        );
        y -= 15;
      }
      if (skill.feedback) {
        for (const line of wrap(`Feedback: ${skill.feedback}`, font, 9, contentWidth - 16)) {
          need(14);
          page.drawText(line, { x: margin + 8, y: y - 9, size: 9, font, color: MUTED });
          y -= 13;
        }
      }
      y -= 8;
      continue;
    }

    if (skill.answers.length === 0) {
      y -= 6;
      continue;
    }

    const cols = [46, 200, 200, 69];
    const headerY = y;
    page.drawRectangle({
      x: margin,
      y: headerY - 16,
      width: contentWidth,
      height: 16,
      color: rgb(0.93, 0.95, 0.99)
    });
    ["Q", "Candidate answer", "Accepted", "Result"].forEach((label, i) => {
      const x = margin + cols.slice(0, i).reduce((s, w) => s + w, 0) + 6;
      page.drawText(label, { x, y: headerY - 12, size: 8, font: bold, color: rgb(0.11, 0.25, 0.6) });
    });
    y -= 16;

    for (const answer of skill.answers) {
      need(14);
      const cells = [
        answer.number,
        answer.candidate,
        answer.accepted,
        answer.correct ? "Correct" : "Wrong"
      ];
      cells.forEach((cell, i) => {
        const x = margin + cols.slice(0, i).reduce((s, w) => s + w, 0) + 6;
        page.drawText(truncate(String(cell), font, 8.5, cols[i]! - 10), {
          x,
          y: y - 10,
          size: 8.5,
          font,
          color: i === 3 ? (answer.correct ? rgb(0.05, 0.5, 0.3) : rgb(0.72, 0.16, 0.16)) : INK
        });
      });
      page.drawLine({
        start: { x: margin, y: y - 13 },
        end: { x: margin + contentWidth, y: y - 13 },
        thickness: 0.4,
        color: LINE
      });
      y -= 14;
    }
    y -= 10;
  }

  page.drawText(pdfSafe(`Generated ${detail.generatedAt}`), {
    x: margin,
    y: margin - 16,
    size: 8,
    font,
    color: MUTED
  });

  return Buffer.from(await doc.save());
}

export async function resultsPdf(data: Dataset): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [792, 612];
  const margin = 40;
  const contentWidth = pageSize[0] - margin * 2;
  const fontSize = 8.5;
  const rowHeight = 18;

  const weights = [2.4, 3, 1.8, 3, 2.2, 1.3, 1, 1.3, 1, 1.2, 1.2, 1];
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const widths = weights.map((w) => (w / totalWeight) * contentWidth);

  let page = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  page.drawText("ZiyoMock — Mock Results", { x: margin, y, size: 16, font: bold, color: INK });
  y -= 18;
  page.drawText(`${data.scopeLabel}  ·  Generated ${data.generatedAt}  ·  ${data.rows.length} attempt(s)`, {
    x: margin,
    y,
    size: 9,
    font,
    color: MUTED
  });
  y -= 20;

  const drawHeader = () => {
    page.drawRectangle({ x: margin, y: y - rowHeight + 4, width: contentWidth, height: rowHeight, color: BRAND });
    let x = margin + 4;
    data.columns.forEach((col, i) => {
      page.drawText(truncate(col, bold, fontSize, widths[i]! - 6), {
        x,
        y: y - rowHeight + 10,
        size: fontSize,
        font: bold,
        color: rgb(1, 1, 1)
      });
      x += widths[i]!;
    });
    y -= rowHeight;
  };

  drawHeader();

  data.rows.forEach((row, index) => {
    if (y < margin + rowHeight) {
      page = doc.addPage(pageSize);
      y = pageSize[1] - margin;
      drawHeader();
    }
    if (index % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + 4,
        width: contentWidth,
        height: rowHeight,
        color: rgb(0.96, 0.97, 0.99)
      });
    }
    let x = margin + 4;
    row.forEach((cell, i) => {
      page.drawText(truncate(String(cell ?? ""), font, fontSize, widths[i]! - 6), {
        x,
        y: y - rowHeight + 10,
        size: fontSize,
        font,
        color: INK
      });
      x += widths[i]!;
    });
    page.drawLine({
      start: { x: margin, y: y - rowHeight + 3 },
      end: { x: margin + contentWidth, y: y - rowHeight + 3 },
      thickness: 0.5,
      color: LINE
    });
    y -= rowHeight;
  });

  if (data.rows.length === 0) {
    page.drawText("No submitted attempts found for this selection.", {
      x: margin,
      y: y - 14,
      size: 10,
      font,
      color: MUTED
    });
  }

  return Buffer.from(await doc.save());
}

export async function writingPdf(scopeLabel: string, docs: WritingDoc[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const pageSize: [number, number] = [612, 792];
  const margin = 48;
  const contentWidth = pageSize[0] - margin * 2;

  let page: PDFPage = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  const ensure = (needed: number) => {
    if (y - needed < margin) {
      page = doc.addPage(pageSize);
      y = pageSize[1] - margin;
    }
  };

  const paragraph = (
    text: string,
    used: PDFFont,
    size: number,
    color = INK,
    indent = 0,
    gap = 3
  ) => {
    for (const line of wrap(text, used, size, contentWidth - indent)) {
      ensure(size + gap);
      page.drawText(line, { x: margin + indent, y: y - size, size, font: used, color });
      y -= size + gap;
    }
  };

  page.drawText("ZiyoMock — Writing Answers", { x: margin, y: y - 18, size: 18, font: bold, color: INK });
  y -= 24;
  page.drawText(`${scopeLabel}  ·  ${docs.length} candidate submission(s)`, {
    x: margin,
    y: y - 12,
    size: 10,
    font,
    color: MUTED
  });
  y -= 26;

  docs.forEach((entry, index) => {
    ensure(70);
    if (index > 0) y -= 6;
    page.drawRectangle({
      x: margin,
      y: y - 44,
      width: contentWidth,
      height: 44,
      color: rgb(0.95, 0.96, 0.99)
    });
    page.drawText(pdfSafe(entry.candidate), { x: margin + 8, y: y - 17, size: 12, font: bold, color: INK });
    page.drawText(pdfSafe(entry.email), { x: margin + 8, y: y - 31, size: 9, font, color: MUTED });
    const meta = `${entry.mock}  ·  ${entry.submittedAt}  ·  Writing band ${entry.overallWriting}`;
    page.drawText(truncate(meta, font, 9, contentWidth - 16), {
      x: margin + 8,
      y: y - 41,
      size: 9,
      font,
      color: MUTED
    });
    y -= 54;

    for (const task of entry.tasks) {
      ensure(30);
      page.drawText(`Task ${task.number}  ·  ${task.wordCount} words${task.band !== null ? `  ·  band ${task.band.toFixed(1)}` : ""}`, {
        x: margin,
        y: y - 11,
        size: 10,
        font: bold,
        color: BRAND
      });
      y -= 16;
      paragraph(task.prompt, italic, 9, MUTED, 0, 2);
      y -= 4;
      paragraph(task.essay || "No response.", font, 10, INK, 0, 3);
      y -= 10;
    }
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + contentWidth, y },
      thickness: 0.75,
      color: LINE
    });
    y -= 6;
  });

  if (docs.length === 0) {
    page.drawText("No writing submissions found for this selection.", {
      x: margin,
      y: y - 14,
      size: 11,
      font,
      color: MUTED
    });
  }

  return Buffer.from(await doc.save());
}
