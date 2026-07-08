import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Dataset, WritingDoc } from "./gather";

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
