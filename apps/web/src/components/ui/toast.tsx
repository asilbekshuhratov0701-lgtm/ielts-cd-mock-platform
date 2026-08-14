"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "error" | "info" | "loading";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  progress?: number;
}

interface ToastRecord extends ToastOptions {
  id: string;
  variant: ToastVariant;
  leaving?: boolean;
}

interface ToastApi {
  show: (options: ToastOptions) => string;
  update: (id: string, options: Partial<ToastOptions>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION = 4500;

const STYLES: Record<
  ToastVariant,
  { icon: ReactNode; ring: string; bar: string; iconWrap: string }
> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    ring: "border-emerald-200/80 dark:border-emerald-500/30",
    bar: "bg-emerald-500",
    iconWrap: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
  },
  error: {
    icon: <XCircle className="h-5 w-5" />,
    ring: "border-red-200/80 dark:border-red-500/30",
    bar: "bg-red-500",
    iconWrap: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    ring: "border-brand-200/80 dark:border-brand-500/30",
    bar: "bg-brand-500",
    iconWrap: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
  },
  loading: {
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    ring: "border-border",
    bar: "bg-brand-500",
    iconWrap: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
  }
};

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

function ToastCard({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const style = STYLES[toast.variant];
  const showProgress = typeof toast.progress === "number";
  const pct = showProgress ? Math.max(0, Math.min(100, Math.round(toast.progress!))) : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-surface shadow-card",
        "transition-all duration-200 ease-out",
        style.ring,
        toast.leaving ? "translate-x-2 opacity-0" : "translate-x-0 opacity-100"
      )}
    >
      <div className="flex items-start gap-3 p-3.5">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            style.iconWrap
          )}
        >
          {style.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{toast.title}</p>
          {toast.description ? (
            <p className="mt-0.5 break-words text-xs leading-relaxed text-muted">
              {toast.description}
            </p>
          ) : null}
          {showProgress ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className={cn("h-full rounded-full transition-all duration-150", style.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums text-muted">
                {pct}%
              </span>
            </div>
          ) : null}
        </div>
        {toast.variant === "loading" ? null : (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="-mr-1 -mt-1 rounded-md p-1 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const counter = useRef(0);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const arm = useCallback(
    (id: string, variant: ToastVariant, duration?: number) => {
      const existing = timers.current.get(id);
      if (existing) {
        clearTimeout(existing);
        timers.current.delete(id);
      }
      if (variant === "loading") return;
      const ms = duration ?? DEFAULT_DURATION;
      if (ms === Infinity) return;
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ms)
      );
    },
    [dismiss]
  );

  const show = useCallback(
    (options: ToastOptions) => {
      counter.current += 1;
      const id = `t${counter.current}`;
      const variant = options.variant ?? "info";
      setToasts((list) => [...list.slice(-3), { ...options, id, variant }]);
      arm(id, variant, options.duration);
      return id;
    },
    [arm]
  );

  const update = useCallback(
    (id: string, options: Partial<ToastOptions>) => {
      setToasts((list) =>
        list.map((t) => {
          if (t.id !== id) return t;
          const next = { ...t, ...options };
          next.variant = options.variant ?? t.variant;
          return next;
        })
      );
      if (options.variant) arm(id, options.variant, options.duration);
    },
    [arm]
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(() => ({ show, update, dismiss }), [show, update, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end">
              {toasts.map((toast) => (
                <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
              ))}
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}
