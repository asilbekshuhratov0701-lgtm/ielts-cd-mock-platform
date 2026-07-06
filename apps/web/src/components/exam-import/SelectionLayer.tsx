"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction
} from "react";
import { StickyNote, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ExamNote {
  id: string;
  snippet: string;
  text: string;
}

const COLORS = [
  { key: "yellow", swatch: "bg-yellow-300" },
  { key: "green", swatch: "bg-green-300" },
  { key: "pink", swatch: "bg-pink-300" },
  { key: "blue", swatch: "bg-blue-300" }
] as const;

export function SelectionLayer({
  containerRef,
  notes,
  setNotes,
  panelOpen,
  setPanelOpen
}: {
  containerRef: RefObject<HTMLElement | null>;
  notes: ExamNote[];
  setNotes: Dispatch<SetStateAction<ExamNote[]>>;
  panelOpen: boolean;
  setPanelOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [toolbar, setToolbar] = useState<{ x: number; y: number } | null>(null);
  const rangeRef = useRef<Range | null>(null);
  const buckets = useRef<Record<string, Range[]>>({ yellow: [], green: [], pink: [], blue: [] });
  const [noteDraft, setNoteDraft] = useState<{ snippet: string; text: string } | null>(null);

  const captureSelection = useCallback(() => {
    const sel = window.getSelection();
    const container = containerRef.current;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !container) {
      setToolbar(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setToolbar(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setToolbar(null);
      return;
    }
    rangeRef.current = range.cloneRange();
    setToolbar({ x: rect.left + rect.width / 2, y: rect.top });
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("mouseup", captureSelection);
    const hide = () => setToolbar(null);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("mouseup", captureSelection);
      window.removeEventListener("scroll", hide, true);
    };
  }, [captureSelection]);

  function rebuild() {
    const g = globalThis as unknown as {
      CSS?: { highlights?: Map<string, unknown> };
      Highlight?: new (...ranges: Range[]) => unknown;
    };
    if (!g.CSS?.highlights || typeof g.Highlight !== "function") return;
    for (const c of COLORS) {
      const ranges = buckets.current[c.key] ?? [];
      if (ranges.length > 0) g.CSS.highlights.set(`hl-${c.key}`, new g.Highlight(...ranges));
    }
  }

  function highlight(colorKey: string) {
    const range = rangeRef.current;
    if (range) {
      buckets.current[colorKey]?.push(range.cloneRange());
      rebuild();
    }
    window.getSelection()?.removeAllRanges();
    setToolbar(null);
  }

  function startNote() {
    const range = rangeRef.current;
    const snippet = range ? range.toString().replace(/\s+/g, " ").trim().slice(0, 160) : "";
    setNoteDraft({ snippet, text: "" });
    setToolbar(null);
  }

  function saveNote() {
    if (noteDraft && noteDraft.text.trim()) {
      setNotes((n) => [
        ...n,
        { id: `${Date.now()}-${n.length}`, snippet: noteDraft.snippet, text: noteDraft.text.trim() }
      ]);
    }
    setNoteDraft(null);
    window.getSelection()?.removeAllRanges();
  }

  return (
    <>
      {toolbar ? (
        <div
          className="fixed z-[60] flex -translate-x-1/2 -translate-y-full items-center gap-1.5 rounded-xl border border-border bg-surface p-1.5 shadow-card"
          style={{ left: toolbar.x, top: toolbar.y - 8 }}
        >
          {COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => highlight(c.key)}
              className={cn("h-6 w-6 rounded-full ring-1 ring-black/10 hover:scale-110", c.swatch)}
              aria-label={`Highlight ${c.key}`}
            />
          ))}
          <span className="mx-0.5 h-6 w-px bg-border" />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={startNote}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-foreground hover:bg-brand-50"
          >
            <StickyNote className="h-4 w-4 text-brand-600" /> Notes
          </button>
        </div>
      ) : null}

      {noteDraft ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4"
          onClick={() => setNoteDraft(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 font-semibold text-foreground">Add note</h3>
            {noteDraft.snippet ? (
              <p className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-sm italic text-foreground/70">
                “{noteDraft.snippet}”
              </p>
            ) : null}
            <textarea
              autoFocus
              value={noteDraft.text}
              onChange={(e) => setNoteDraft({ ...noteDraft, text: e.target.value })}
              rows={4}
              placeholder="Write your note about the selected text…"
              className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteDraft(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-black/[0.05]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNote}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {panelOpen ? (
        <div className="fixed right-0 top-0 z-[70] flex h-full w-80 flex-col border-l border-border bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-semibold text-foreground">Written notes ({notes.length})</h3>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded-md p-1 text-muted hover:bg-black/[0.05]"
              aria-label="Close notes"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {notes.length === 0 ? (
              <p className="text-sm text-muted">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-border p-3">
                    {n.snippet ? (
                      <p className="mb-1 text-xs italic text-muted">“{n.snippet}”</p>
                    ) : null}
                    <p className="whitespace-pre-wrap text-sm text-foreground">{n.text}</p>
                    <button
                      type="button"
                      onClick={() => setNotes((list) => list.filter((x) => x.id !== n.id))}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
