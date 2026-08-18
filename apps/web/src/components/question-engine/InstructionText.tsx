import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const CAPS_WORD = "[A-Z][A-Z0-9]*(?:[/-][A-Z0-9]+)*(?![a-z])";
const CAPS_RUN = new RegExp(`\\b${CAPS_WORD}(?:\\s+${CAPS_WORD})*`, "g");

function isDirective(run: string): boolean {
  return run.replace(/[^A-Z]/g, "").length >= 2;
}

export function emphasizeDirectives(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(CAPS_RUN)) {
    const run = match[0];
    const start = match.index ?? 0;
    if (!isDirective(run)) continue;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <strong
        key={`${start}-${run}`}
        className="rounded-[4px] bg-brand-500/15 px-1 font-bold tracking-wide text-foreground"
      >
        {run}
      </strong>
    );
    last = start + run.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function InstructionText({ text, className }: { text: string; className?: string }) {
  return (
    <p className={cn("font-medium leading-relaxed text-foreground", className)}>
      {emphasizeDirectives(text)}
    </p>
  );
}
