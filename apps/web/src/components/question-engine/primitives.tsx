"use client";

import { cn } from "@/lib/cn";

function countWords(text: string): number {
  const t = text.trim();
  return t.length === 0 ? 0 : t.split(/\s+/).length;
}

export function GapInput({
  number,
  value,
  onChange,
  wordLimit,
  allowNumber
}: {
  number: number;
  value: string;
  onChange: (value: string) => void;
  wordLimit: number;
  allowNumber: boolean;
}) {
  const words = countWords(value);
  const overLimit = words > wordLimit;
  const numberViolation = !allowNumber && /\d/.test(value);
  const invalid = overLimit || numberViolation;
  const widthCh = Math.max(7, Math.min(22, wordLimit * 7 + 1));

  return (
    <span className="relative inline-block align-baseline">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={String(number)}
        aria-label={`Answer ${number}`}
        aria-invalid={invalid}
        style={{ width: `${widthCh}ch` }}
        className={cn(
          "mx-1 inline-block h-8 rounded-md border bg-surface px-2 align-baseline text-sm text-foreground",
          "placeholder:font-normal placeholder:text-muted/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
          invalid ? "border-red-400 ring-1 ring-red-300" : "border-border"
        )}
      />
      {invalid ? (
        <span className="absolute left-1 top-full mt-0.5 whitespace-nowrap text-[10px] font-medium text-red-600">
          {numberViolation
            ? "No numbers"
            : `Max ${wordLimit} word${wordLimit > 1 ? "s" : ""}`}
        </span>
      ) : null}
    </span>
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
        return (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
              selected
                ? "border-brand-300 bg-brand-50 text-brand-800"
                : "border-border hover:bg-brand-50/50"
            )}
          >
            <input
              type="radio"
              name={name}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 text-brand-600"
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
              "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
              checked
                ? "border-brand-300 bg-brand-50 text-brand-800"
                : "border-border hover:bg-brand-50/50",
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
              className="mt-0.5 rounded text-brand-600"
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
  placeholder = "Select"
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  options: { id: string; text: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        "inline-block h-8 max-w-[16rem] rounded-md border bg-surface px-2 align-baseline text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
        value ? "border-brand-300 text-brand-800" : "border-border text-muted"
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id} className="text-foreground">
          {o.text}
        </option>
      ))}
    </select>
  );
}
