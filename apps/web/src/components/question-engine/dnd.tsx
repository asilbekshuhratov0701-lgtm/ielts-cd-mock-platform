"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useAnswers, useSetAnswer } from "./answers-store";
import type { SelectGroup } from "./types";

export type DragPayload = { optionId: string; groupId: string; from: string | null };

type Zone = { el: HTMLElement; groupId: string; drop: (payload: DragPayload) => void };

type DragStore = {
  active: DragPayload | null;
  picked: DragPayload | null;
  over: string | null;
  point: { x: number; y: number } | null;
  beginPress: (payload: DragPayload, label: string, e: React.PointerEvent) => void;
  pick: (payload: DragPayload) => void;
  cancel: () => void;
  commit: (zoneId: string) => boolean;
  consumeDragged: () => boolean;
  register: (id: string, zone: Zone | null) => void;
};

const DragContext = createContext<DragStore | null>(null);

const PassageHostContext = createContext<ReadonlySet<string>>(new Set());

export function PassageHostProvider({
  hosted,
  children
}: {
  hosted: ReadonlySet<string>;
  children: React.ReactNode;
}) {
  return <PassageHostContext.Provider value={hosted}>{children}</PassageHostContext.Provider>;
}

export function useHostedInPassage(groupId: string): boolean {
  return useContext(PassageHostContext).has(groupId);
}

function DragPreview({ label, point }: { label: string; point: { x: number; y: number } }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-[100] max-w-sm rounded-md border border-brand-400 bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-lg"
      style={{ left: point.x + 14, top: point.y + 14 }}
    >
      {label}
    </div>,
    document.body
  );
}

export function DragProvider({ children }: { children: React.ReactNode }) {
  const zones = useRef(new Map<string, Zone>());
  const pending = useRef<{ payload: DragPayload; label: string; x: number; y: number } | null>(null);
  const activeRef = useRef<DragPayload | null>(null);
  const pickedRef = useRef<DragPayload | null>(null);
  const overRef = useRef<string | null>(null);
  const draggedRef = useRef(false);

  const [active, setActive] = useState<DragPayload | null>(null);
  const [picked, setPicked] = useState<DragPayload | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [label, setLabel] = useState("");

  const register = useCallback((id: string, zone: Zone | null) => {
    if (zone) zones.current.set(id, zone);
    else zones.current.delete(id);
  }, []);

  const hitTest = useCallback((x: number, y: number, groupId: string): string | null => {
    for (const [id, zone] of zones.current) {
      if (zone.groupId !== groupId) continue;
      const r = zone.el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  }, []);

  const beginPress = useCallback(
    (payload: DragPayload, dragLabel: string, e: React.PointerEvent) => {
      pending.current = { payload, label: dragLabel, x: e.clientX, y: e.clientY };
      draggedRef.current = false;

      const move = (ev: PointerEvent) => {
        const p = pending.current;
        if (!activeRef.current) {
          if (!p) return;
          if (Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < 5) return;
          activeRef.current = p.payload;
          draggedRef.current = true;
          pickedRef.current = null;
          setPicked(null);
          setActive(p.payload);
          setLabel(p.label);
        }
        ev.preventDefault();
        setPoint({ x: ev.clientX, y: ev.clientY });
        const target = hitTest(ev.clientX, ev.clientY, activeRef.current.groupId);
        overRef.current = target;
        setOver(target);
      };

      const finish = () => {
        const target = overRef.current;
        const payloadNow = activeRef.current;
        if (payloadNow && target) zones.current.get(target)?.drop(payloadNow);
        pending.current = null;
        activeRef.current = null;
        overRef.current = null;
        setActive(null);
        setOver(null);
        setPoint(null);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
      };

      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    },
    [hitTest]
  );

  const pick = useCallback((payload: DragPayload) => {
    const cur = pickedRef.current;
    const same =
      cur !== null &&
      cur.optionId === payload.optionId &&
      cur.groupId === payload.groupId &&
      cur.from === payload.from;
    const next = same ? null : payload;
    pickedRef.current = next;
    setPicked(next);
  }, []);

  const cancel = useCallback(() => {
    pickedRef.current = null;
    setPicked(null);
  }, []);

  const commit = useCallback((zoneId: string) => {
    const cur = pickedRef.current;
    if (!cur) return false;
    const zone = zones.current.get(zoneId);
    if (!zone || zone.groupId !== cur.groupId) return false;
    zone.drop(cur);
    pickedRef.current = null;
    setPicked(null);
    return true;
  }, []);

  const consumeDragged = useCallback(() => {
    const value = draggedRef.current;
    draggedRef.current = false;
    return value;
  }, []);

  useEffect(() => {
    if (!picked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, cancel]);

  const value = useMemo<DragStore>(
    () => ({ active, picked, over, point, beginPress, pick, cancel, commit, consumeDragged, register }),
    [active, picked, over, point, beginPress, pick, cancel, commit, consumeDragged, register]
  );

  return (
    <DragContext.Provider value={value}>
      {children}
      {active && point ? <DragPreview label={label} point={point} /> : null}
    </DragContext.Provider>
  );
}

export function DragBoundary({ children }: { children: React.ReactNode }) {
  const existing = useContext(DragContext);
  if (existing) return <>{children}</>;
  return <DragProvider>{children}</DragProvider>;
}

function useDrag(): DragStore {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error("drag components must be used within a DragProvider");
  return ctx;
}

function useZone(id: string, groupId: string, drop: (payload: DragPayload) => void) {
  const { register } = useDrag();
  const dropRef = useRef(drop);
  dropRef.current = drop;
  const attach = useCallback(
    (el: HTMLElement | null) => {
      if (el) register(id, { el, groupId, drop: (p) => dropRef.current(p) });
      else register(id, null);
    },
    [register, id, groupId]
  );
  useEffect(() => () => register(id, null), [register, id]);
  return attach;
}

function usedOptionIds(group: SelectGroup, answers: Record<string, unknown>): Set<string> {
  const used = new Set<string>();
  for (const p of group.prompts) {
    const v = answers[p.id];
    if (typeof v === "string" && v) used.add(v);
  }
  return used;
}

export function OptionChip({
  group,
  option
}: {
  group: SelectGroup;
  option: { id: string; text: string };
}) {
  const drag = useDrag();
  const answers = useAnswers();
  const used = usedOptionIds(group, answers).has(option.id);
  const disabled = used && !group.allowReuse;
  const payload: DragPayload = { optionId: option.id, groupId: group.id, from: null };
  const isPicked =
    drag.picked !== null &&
    drag.picked.groupId === group.id &&
    drag.picked.optionId === option.id &&
    drag.picked.from === null;
  const isActive =
    drag.active !== null && drag.active.groupId === group.id && drag.active.optionId === option.id;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={isPicked}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return;
        drag.beginPress(payload, option.text, e);
      }}
      onClick={() => {
        if (disabled) return;
        if (drag.consumeDragged()) return;
        drag.pick(payload);
      }}
      className={cn(
        "flex w-full touch-none select-none items-start gap-3 rounded-md border px-3 py-2.5 text-left text-base transition-colors",
        disabled
          ? "cursor-not-allowed border-border bg-black/[0.03] text-muted opacity-60"
          : "cursor-grab border-border bg-surface hover:border-brand-300 hover:bg-brand-50/50",
        isPicked ? "border-brand-400 bg-brand-50 ring-2 ring-brand-500/30" : null,
        isActive ? "opacity-40" : null,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      )}
    >
      <span className="min-w-5 shrink-0 text-sm text-muted">{option.id}.</span>
      <span className="font-semibold text-foreground">{option.text}</span>
    </button>
  );
}

export function OptionBank({ group, hint }: { group: SelectGroup; hint: string }) {
  const setAnswer = useSetAnswer();
  const attach = useZone(`bank:${group.id}`, group.id, (payload) => {
    if (payload.from) setAnswer(payload.from, null);
  });
  return (
    <div
      ref={attach}
      className="rounded-lg border border-border bg-black/[0.02] p-3"
      data-hl
      data-hl-id={`bank:${group.id}`}
    >
      <p className="mb-2 text-sm italic text-muted">{hint}</p>
      <div className="flex flex-col gap-2">
        {group.optionBank.map((o) => (
          <OptionChip key={o.id} group={group} option={o} />
        ))}
      </div>
    </div>
  );
}

export function AnswerSlot({
  group,
  promptId,
  number,
  variant = "inline",
  placeholder = "Drop answer here"
}: {
  group: SelectGroup;
  promptId: string;
  number: number;
  variant?: "inline" | "block";
  placeholder?: string;
}) {
  const drag = useDrag();
  const answers = useAnswers();
  const setAnswer = useSetAnswer();

  const current = answers[promptId];
  const optionId = typeof current === "string" && current ? current : null;
  const option = optionId ? (group.optionBank.find((o) => o.id === optionId) ?? null) : null;

  const attach = useZone(promptId, group.id, (payload) => {
    if (payload.from === promptId) return;
    if (payload.from) setAnswer(payload.from, group.allowReuse ? null : optionId);
    setAnswer(promptId, payload.optionId);
  });

  const isOver = drag.over === promptId;
  const armed = drag.picked !== null && drag.picked.groupId === group.id;
  const payload: DragPayload = optionId
    ? { optionId, groupId: group.id, from: promptId }
    : { optionId: "", groupId: group.id, from: promptId };
  const isPicked =
    drag.picked !== null && drag.picked.groupId === group.id && drag.picked.from === promptId;

  return (
    <span
      className={cn(
        variant === "inline" ? "inline-flex align-middle" : "flex w-full",
        "items-stretch gap-1"
      )}
    >
      <button
        type="button"
        ref={attach as unknown as React.Ref<HTMLButtonElement>}
        aria-label={
          option ? `Answer ${number}: ${option.text}` : `Answer ${number}: empty, drop an option here`
        }
        onPointerDown={(e) => {
          if (!optionId || e.button !== 0) return;
          drag.beginPress({ optionId, groupId: group.id, from: promptId }, option?.text ?? "", e);
        }}
        onClick={() => {
          if (drag.consumeDragged()) return;
          if (armed) {
            drag.commit(promptId);
            return;
          }
          if (optionId) drag.pick(payload);
        }}
        className={cn(
          "flex min-h-[2.5rem] touch-none select-none items-center gap-2 rounded-md border px-2 py-1 text-left text-base transition-colors",
          variant === "inline" ? "min-w-[13rem] max-w-full" : "w-full",
          option
            ? "cursor-grab border-brand-300 bg-brand-50"
            : "border-dashed border-foreground/35 bg-surface",
          isOver ? "border-brand-500 bg-brand-100 ring-2 ring-brand-500/30" : null,
          armed && !isOver ? "border-brand-400/70" : null,
          isPicked ? "ring-2 ring-brand-500/30" : null,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        )}
      >
        <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md border border-foreground/40 px-1 text-sm font-bold text-foreground">
          {number}
        </span>
        {option ? (
          <span className="flex items-baseline gap-1.5">
            <span className="text-sm text-muted">{option.id}.</span>
            <span className="font-semibold text-brand-800">{option.text}</span>
          </span>
        ) : (
          <span className="text-sm italic text-muted">{placeholder}</span>
        )}
      </button>
      {option ? (
        <button
          type="button"
          aria-label={`Clear answer ${number}`}
          onClick={() => setAnswer(promptId, null)}
          className="shrink-0 rounded-md border border-transparent px-1.5 text-lg leading-none text-muted transition-colors hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

