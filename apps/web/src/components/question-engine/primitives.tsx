"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export function wordLimitPhrase(wordLimit: number, allowNumber: boolean): string {
  if (wordLimit === 1) return allowNumber ? "ONE WORD AND/OR A NUMBER" : "ONE WORD ONLY";
  const words = wordLimit === 2 ? "TWO WORDS" : wordLimit === 3 ? "THREE WORDS" : `${wordLimit} WORDS`;
  return `NO MORE THAN ${words}${allowNumber ? " AND/OR A NUMBER" : ""}`;
}

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

export function LabellingImage({ src, alt }: { src: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);

  return (
    <>
      <figure className="mb-4 rounded-xl border border-border bg-foreground/[0.02] p-2">
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label={`${alt} — enlarge`}
          className="block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <img src={src} alt={alt} className="mx-auto max-h-[70vh] w-full object-contain" />
        </button>
        <figcaption className="mt-1 text-center text-xs text-muted">
          Click the image to enlarge
        </figcaption>
      </figure>
      {zoomed && mounted
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={alt}
              onClick={() => setZoomed(false)}
              className="fixed inset-0 z-[120] flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
            >
              <img src={src} alt={alt} className="h-full w-full object-contain" />
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export function LabellingImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="mb-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-foreground/[0.02] px-4 text-center text-xs text-muted">
      {label}
    </div>
  );
}

export function GapInput({
  number,
  value,
  onChange,
  wordLimit,
  allowNumber = true
}: {
  number: number;
  value: string;
  onChange: (value: string) => void;
  wordLimit?: number;
  allowNumber?: boolean;
}) {
  const overLimit = wordLimit !== undefined && wordLimit > 0 && countWords(value) > wordLimit;
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={String(number)}
      aria-label={`Answer ${number}`}
      title={wordLimit ? `Write ${wordLimitPhrase(wordLimit, allowNumber)}` : undefined}
      className={cn(
        "mx-1 inline-block h-8 min-w-[7ch] max-w-[24ch] rounded-md border bg-surface px-2 align-baseline text-base text-foreground",
        "placeholder:font-normal placeholder:text-muted/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
        overLimit ? "border-amber-400 ring-1 ring-amber-300" : "border-border"
      )}
    />
  );
}

export function RadioInput({
  name,
  options,
  value,
  onChange
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-[var(--space-option)]">
      {options.map((opt) => {
        const selected = value === opt.value;
        const norm = (s: string) => s.trim().toUpperCase().replace(/[_\s]+/g, " ");
        const sameAsLabel = norm(opt.value) === norm(opt.label);
        return (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-2.5 text-base transition-colors",
              selected
                ? "border-brand-300 bg-brand-50 text-brand-800"
                : "border-border text-foreground hover:bg-brand-50/50"
            )}
          >
            <input
              type="radio"
              name={name}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 h-4 w-4 text-brand-600"
            />
            {sameAsLabel ? (
              <span className="font-semibold text-brand-700">{opt.label.replace(/_/g, " ")}</span>
            ) : (
              <span>
                <span className="mr-1.5 font-semibold text-brand-700">{opt.value}</span>
                {opt.label}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

export function CheckboxInput({
  options,
  value,
  onChange,
  maxSelections
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  maxSelections: number;
}) {
  const atMax = value.length >= maxSelections;
  return (
    <div className="flex flex-col gap-[var(--space-option)]">
      {options.map((opt) => {
        const checked = value.includes(opt.value);
        const disabled = !checked && atMax;
        return (
          <label
            key={opt.value}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-2.5 text-base transition-colors",
              checked
                ? "border-brand-300 bg-brand-50 text-brand-800"
                : "border-border text-foreground hover:bg-brand-50/50",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() =>
                onChange(
                  checked ? value.filter((v) => v !== opt.value) : [...value, opt.value]
                )
              }
              className="mt-0.5 h-4 w-4 rounded text-brand-600"
            />
            <span>
              <span className="mr-1.5 font-semibold text-brand-700">{opt.value}</span>
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function SelectMatch({
  value,
  onChange,
  options,
  placeholder = "Select",
  letterOnly = true
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  options: { id: string; text: string }[];
  placeholder?: string;
  letterOnly?: boolean;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        "inline-block h-8 max-w-[16rem] rounded-md border bg-surface px-2 align-baseline text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
        value ? "border-brand-300 text-brand-800" : "border-border text-muted"
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id} className="text-foreground">
          {letterOnly ? o.id : o.text}
        </option>
      ))}
    </select>
  );
}
