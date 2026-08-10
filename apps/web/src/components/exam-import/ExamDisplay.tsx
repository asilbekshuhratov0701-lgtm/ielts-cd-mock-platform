"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { Check, Coffee, Moon, Sun, SunMoon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ExamDisplayMode = "standard" | "sepia" | "night";

const STORAGE_KEY = "ziyomock-exam-display";

export const EXAM_MODE_CLASS: Record<ExamDisplayMode, string> = {
  standard: "exam-mode-standard",
  sepia: "exam-mode-sepia",
  night: "exam-mode-night"
};

const MODES: { value: ExamDisplayMode; label: string; icon: LucideIcon }[] = [
  { value: "standard", label: "Standard", icon: Sun },
  { value: "sepia", label: "Sepia", icon: Coffee },
  { value: "night", label: "Night", icon: Moon }
];

type ExamDisplayContextValue = {
  mode: ExamDisplayMode;
  setMode: (m: ExamDisplayMode) => void;
};

const ExamDisplayContext = createContext<ExamDisplayContextValue>({
  mode: "standard",
  setMode: () => {}
});

function storedMode(): ExamDisplayMode {
  const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  return raw === "sepia" || raw === "night" || raw === "standard" ? raw : "standard";
}

export function ExamDisplayProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ExamDisplayMode>("standard");

  useEffect(() => {
    setModeState(storedMode());
  }, []);

  const setMode = (m: ExamDisplayMode) => {
    localStorage.setItem(STORAGE_KEY, m);
    setModeState(m);
  };

  return (
    <ExamDisplayContext.Provider value={{ mode, setMode }}>{children}</ExamDisplayContext.Provider>
  );
}

export function useExamDisplay(): ExamDisplayContextValue {
  return useContext(ExamDisplayContext);
}

export function ExamSurface({ children }: { children: ReactNode }) {
  const { mode } = useExamDisplay();
  return <div className={EXAM_MODE_CLASS[mode]}>{children}</div>;
}

export function ExamDisplayPicker() {
  const { mode, setMode } = useExamDisplay();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Display mode"
        title="Display mode"
        className="rounded-md p-1.5 text-muted hover:bg-foreground/[0.06]"
      >
        <SunMoon className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Display mode
          </p>
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setMode(m.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm",
                  active
                    ? "bg-brand-50 font-medium text-brand-700"
                    : "text-foreground hover:bg-foreground/[0.05]"
                )}
              >
                <Icon className="h-4 w-4" />
                {m.label}
                {active ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
