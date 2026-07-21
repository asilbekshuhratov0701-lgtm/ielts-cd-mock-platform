import type { SelectGroup } from "./types";

export type HeadingSlot = { id: string; number: number };

function sectionLetter(text: string): string | null {
  const m = text
    .trim()
    .toUpperCase()
    .match(/(?:^|\b)(?:SECTION|PARAGRAPH|PART)?\s*([A-Z])\b\.?$/);
  return m?.[1] ?? null;
}

export function headingSlotsByBlock(
  group: SelectGroup,
  blocks: { text: string; label?: string }[]
): Map<number, HeadingSlot> | null {
  if (group.questionType !== "matching_headings" || group.renderAs !== "drag") return null;
  if (group.prompts.length === 0) return null;

  const labelled: { index: number; label: string }[] = [];
  blocks.forEach((b, i) => {
    const l = b.label?.trim().toUpperCase();
    if (l) labelled.push({ index: i, label: l });
  });
  if (labelled.length === 0) return null;

  const byLabel = new Map<string, number>();
  for (const l of labelled) if (!byLabel.has(l.label)) byLabel.set(l.label, l.index);

  const byLetter = new Map<number, HeadingSlot>();
  let resolvedAll = true;
  for (const p of group.prompts) {
    const letter = sectionLetter(p.text);
    const index = letter ? byLabel.get(letter) : undefined;
    if (index === undefined) {
      resolvedAll = false;
      break;
    }
    byLetter.set(index, { id: p.id, number: p.number });
  }
  if (resolvedAll && byLetter.size === group.prompts.length) return byLetter;

  if (labelled.length === group.prompts.length) {
    const positional = new Map<number, HeadingSlot>();
    group.prompts.forEach((p, i) => {
      const block = labelled[i];
      if (block) positional.set(block.index, { id: p.id, number: p.number });
    });
    return positional;
  }

  return null;
}
