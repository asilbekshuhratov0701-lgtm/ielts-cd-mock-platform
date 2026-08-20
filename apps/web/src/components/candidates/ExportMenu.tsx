"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { cn } from "@/lib/cn";

const FORMATS: [string, string][] = [
  ["xlsx", "Excel (.xlsx)"],
  ["pdf", "PDF (.pdf)"],
  ["doc", "Word (.doc)"],
  ["csv", "CSV (.csv)"],
  ["json", "JSON (.json)"]
];

const MENU_WIDTH = 176;
const MENU_HEIGHT = FORMATS.length * 34 + 8;

export function ExportMenu({
  endpoint,
  params,
  label
}: {
  endpoint: "results" | "writing" | "report" | "group-results" | "candidate-detail";
  params: Record<string, string>;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const href = (format: string) =>
    `/api/admin/exports/${endpoint}?${new URLSearchParams({ ...params, format }).toString()}`;

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    const below = r.bottom + 4;
    const top =
      below + MENU_HEIGHT > window.innerHeight - 8 && r.top - MENU_HEIGHT - 4 >= 8
        ? r.top - MENU_HEIGHT - 4
        : Math.min(below, Math.max(8, window.innerHeight - MENU_HEIGHT - 8));
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-brand-50 hover:text-brand-700",
          open && "bg-brand-50 text-brand-700"
        )}
      >
        <Download className="h-4 w-4" /> {label}
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
              className="fixed z-[100] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-card"
            >
              {FORMATS.map(([format, name]) => (
                <a
                  key={format}
                  role="menuitem"
                  href={href(format)}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-1.5 text-sm text-foreground hover:bg-brand-50 hover:text-brand-700"
                >
                  {name}
                </a>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
