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
export type ExamTextSize = "normal" | "large" | "xlarge";

const MODE_KEY = "ziyomock-exam-display";
const SIZE_KEY = "ziyomock-exam-textsize";

export const EXAM_MODE_CLASS: Record<ExamDisplayMode, string> = {
  standard: "exam-mode-standard",
  sepia: "exam-mode-sepia",
  night: "exam-mode-night"
};

export const EXAM_TEXT_CLASS: Record<ExamTextSize, string> = {
  normal: "exam-text-normal",
  large: "exam-text-large",
  xlarge: "exam-text-xlarge"
};

const MODES: { value: ExamDisplayMode; label: string; icon: LucideIcon }[] = [
  { value: "standard", label: "Standard", icon: Sun },
  { value: "sepia", label: "Sepia", icon: Coffee },
  { value: "night", label: "Night", icon: Moon }
];

const SIZES: { value: ExamTextSize; label: string; cls: string }[] = [
  { value: "normal", label: "Standard text", cls: "text-sm" },
  { value: "large", label: "Large text", cls: "text-base" },
  { value: "xlarge", label: "Extra large text", cls: "text-lg" }
];

type ExamDisplayContextValue = {
  mode: ExamDisplayMode;
  setMode: (m: ExamDisplayMode) => void;
  textSize: ExamTextSize;
  setTextSize: (s: ExamTextSize) => void;
};

const ExamDisplayContext = createContext<ExamDisplayContextValue>({
  mode: "standard",
  setMode: () => {},
  textSize: "normal",
  setTextSize: () => {}
});

function storedMode(): ExamDisplayMode {
  const raw = typeof window !== "undefined" ? localStorage.getItem(MODE_KEY) : null;
  return raw === "sepia" || raw === "night" || raw === "standard" ? raw : "standard";
}

function storedSize(): ExamTextSize {
  const raw = typeof window !== "undefined" ? localStorage.getItem(SIZE_KEY) : null;
  return raw === "large" || raw === "xlarge" || raw === "normal" ? raw : "normal";
}

export function ExamDisplayProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ExamDisplayMode>("standard");
  const [textSize, setTextSizeState] = useState<ExamTextSize>("normal");

  useEffect(() => {
    setModeState(storedMode());
    setTextSizeState(storedSize());
  }, []);

  const setMode = (m: ExamDisplayMode) => {
    localStorage.setItem(MODE_KEY, m);
    setModeState(m);
  };
  const setTextSize = (s: ExamTextSize) => {
    localStorage.setItem(SIZE_KEY, s);
    setTextSizeState(s);
  };

  return (
    <ExamDisplayContext.Provider value={{ mode, setMode, textSize, setTextSize }}>
      {children}
    </ExamDisplayContext.Provider>
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
  const { mode, setMode, textSize, setTextSize } = useExamDisplay();
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
        aria-label="Display settings"
        title="Display settings"
        className="rounded-md p-1.5 text-muted hover:bg-foreground/[0.06]"
      >
        <SunMoon className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
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
                onClick={() => setMode(m.value)}
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

          <div className="my-1 border-t border-border" />

          <p className="px-3 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Text size
          </p>
          <div className="flex items-stretch gap-1 px-2 pb-1.5">
            {SIZES.map((s) => {
              const active = textSize === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  aria-label={s.label}
                  title={s.label}
                  onClick={() => setTextSize(s.value)}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-md border py-1.5 font-semibold leading-none",
                    s.cls,
                    active
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-border text-foreground hover:bg-foreground/[0.05]"
                  )}
                >
                  A
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
