export type LayoutKind = "table" | "flow";

export type LayoutSeg = { text: string } | { gap: number };

export type LayoutCell = {
  segs: LayoutSeg[];
  header?: boolean;
};

export type TableLayout = { kind: "table"; rows: LayoutCell[][] };
export type FlowLayout = { kind: "flow"; steps: LayoutCell[] };
export type CompletionLayout = (TableLayout | FlowLayout) & { source: string };

const GAP_TOKEN = /\[(\d+)\]/g;

function parseSegments(text: string): LayoutSeg[] {
  const segs: LayoutSeg[] = [];
  let last = 0;
  for (const match of text.matchAll(GAP_TOKEN)) {
    const idx = match.index ?? 0;
    if (idx > last) segs.push({ text: text.slice(last, idx) });
    segs.push({ gap: Number(match[1]) });
    last = idx + match[0].length;
  }
  if (last < text.length) segs.push({ text: text.slice(last) });
  if (segs.length === 0) segs.push({ text: "" });
  return segs;
}

function parseCell(raw: string, header: boolean): LayoutCell {
  const cell: LayoutCell = { segs: parseSegments(raw.trim()) };
  if (header) cell.header = true;
  return cell;
}

export function parseLayoutSource(kind: LayoutKind, source: string): CompletionLayout | null {
  const lines = source.split("\n").map((l) => l.replace(/\r$/, ""));
  const meaningful = lines.filter((l) => l.trim().length > 0);
  if (meaningful.length === 0) return null;

  if (kind === "flow") {
    return { kind: "flow", steps: meaningful.map((l) => parseCell(l, false)), source };
  }

  const rows: LayoutCell[][] = meaningful.map((line) => {
    const isHeader = line.trimStart().startsWith("#");
    const body = isHeader ? line.trimStart().slice(1) : line;
    return body.split("|").map((c) => parseCell(c, isHeader));
  });
  return { kind: "table", rows, source };
}

function isSeg(value: unknown): value is LayoutSeg {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return typeof o.text === "string" || typeof o.gap === "number";
}

function isCell(value: unknown): value is LayoutCell {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return Array.isArray(o.segs) && o.segs.every(isSeg);
}

export function isCompletionLayout(value: unknown): value is CompletionLayout {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  if (o.kind === "table") {
    return Array.isArray(o.rows) && o.rows.every((r) => Array.isArray(r) && r.every(isCell));
  }
  if (o.kind === "flow") {
    return Array.isArray(o.steps) && o.steps.every(isCell);
  }
  return false;
}

export function layoutGapNumbers(layout: CompletionLayout): Set<number> {
  const nums = new Set<number>();
  const cells = layout.kind === "table" ? layout.rows.flat() : layout.steps;
  for (const cell of cells) {
    for (const seg of cell.segs) {
      if ("gap" in seg) nums.add(seg.gap);
    }
  }
  return nums;
}
