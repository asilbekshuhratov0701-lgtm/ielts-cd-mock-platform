"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { HELP_TEXT } from "./types";

export function HelpPopover({ text }: { text?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
      >
        <HelpCircle className="h-3.5 w-3.5" /> Help
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-64 rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed text-muted shadow-card">
            {text ?? HELP_TEXT}
          </div>
        </>
      ) : null}
    </div>
  );
}
