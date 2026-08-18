"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal, useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertTriangle, Search, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { deleteWritingSubmissionsAction } from "@/lib/writing-admin-actions";

export interface WritingRowData {
  key: string;
  candidate: string;
  exam: string;
  kind: "Mock" | "Standalone";
  submittedLabel: string;
  band: number | null;
  href: string;
}

type StatusFilter = "all" | "pending" | "marked";
type KindFilter = "all" | "Mock" | "Standalone";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "marked", label: "Marked" }
];

const KIND_TABS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "Mock", label: "Mock" },
  { value: "Standalone", label: "Standalone" }
];

function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          aria-pressed={value === t.value}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === t.value
              ? "bg-brand-600 text-white"
              : "text-muted hover:bg-brand-50 hover:text-brand-700"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function DeleteSubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : `Delete ${count}`}
    </Button>
  );
}

function ConfirmDialog({
  rows,
  onCancel
}: {
  rows: WritingRowData[];
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const mockCount = rows.filter((r) => r.kind === "Mock").length;
  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm deletion"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
    >
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              Delete {rows.length} submission{rows.length === 1 ? "" : "s"}?
            </h2>
            <p className="mt-1 text-sm text-muted">
              This cannot be undone. Answers, marks and released bands go with them.
            </p>
            {mockCount > 0 ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {mockCount} of these {mockCount === 1 ? "is a" : "are"} mock attempt
                {mockCount === 1 ? "" : "s"} — deleting removes the candidate&apos;s whole mock
                (Listening and Reading included), not just the writing part.
              </p>
            ) : null}
          </div>
        </div>

        <ul className="mt-4 max-h-48 overflow-auto rounded-lg border border-border text-sm">
          {rows.map((r) => (
            <li
              key={r.key}
              className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0"
            >
              <span className="truncate font-medium text-foreground">{r.candidate}</span>
              <span className="shrink-0 text-xs text-muted">{r.exam}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <form action={deleteWritingSubmissionsAction}>
            {rows.map((r) => (
              <input key={r.key} type="hidden" name="key" value={r.key} />
            ))}
            <DeleteSubmitButton count={rows.length} />
          </form>
        </div>
      </Card>
    </div>,
    document.body
  );
}

export function WritingEvaluationTable({ rows }: { rows: WritingRowData[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const headerBox = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "pending" && r.band !== null) return false;
      if (status === "marked" && r.band === null) return false;
      if (kind !== "all" && r.kind !== kind) return false;
      if (q && !`${r.candidate} ${r.exam}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, status, kind]);

  const visibleKeys = useMemo(() => visible.map((r) => r.key), [visible]);
  const selectedVisible = visibleKeys.filter((k) => selected.has(k));
  const allVisibleSelected = visibleKeys.length > 0 && selectedVisible.length === visibleKeys.length;

  useEffect(() => {
    if (headerBox.current) {
      headerBox.current.indeterminate =
        selectedVisible.length > 0 && selectedVisible.length < visibleKeys.length;
    }
  }, [selectedVisible.length, visibleKeys.length]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.key)),
    [rows, selected]
  );

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleKeys.forEach((k) => next.delete(k));
      else visibleKeys.forEach((k) => next.add(k));
      return next;
    });
  }

  const pendingCount = rows.filter((r) => r.band === null).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidate or exam…"
            aria-label="Search submissions"
            className="pl-9"
          />
        </div>
        <SegmentedTabs tabs={STATUS_TABS} value={status} onChange={setStatus} />
        <SegmentedTabs tabs={KIND_TABS} value={kind} onChange={setKind} />
        <span className="text-xs text-muted">
          {visible.length} of {rows.length} · {pendingCount} pending
        </span>
      </div>

      {selectedRows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
          <span className="text-sm font-medium text-brand-800">
            {selectedRows.length} selected
            {selectedRows.length !== selectedVisible.length
              ? ` (${selectedRows.length - selectedVisible.length} hidden by filters)`
              : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-brand-50/40 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  ref={headerBox}
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  disabled={visibleKeys.length === 0}
                  aria-label="Select all visible submissions"
                  className="h-4 w-4 rounded border-border text-brand-600"
                />
              </th>
              <th className="px-4 py-3 font-medium">Candidate</th>
              <th className="px-4 py-3 font-medium">Exam</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  Nothing matches those filters.
                </td>
              </tr>
            ) : (
              visible.map((r) => {
                const checked = selected.has(r.key);
                return (
                  <tr
                    key={r.key}
                    className={cn(checked ? "bg-brand-50/60" : "hover:bg-brand-50/30")}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRow(r.key)}
                        aria-label={`Select ${r.candidate}`}
                        className="h-4 w-4 rounded border-border text-brand-600"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{r.candidate}</td>
                    <td className="px-4 py-3 text-muted">{r.exam}</td>
                    <td className="px-4 py-3">
                      <Badge variant="muted">{r.kind}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{r.submittedLabel}</td>
                    <td className="px-4 py-3">
                      {r.band !== null ? (
                        <Badge variant="success">band {r.band.toFixed(1)}</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={r.href} className="font-medium text-brand-700 hover:underline">
                        Evaluate
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {confirming && selectedRows.length > 0 ? (
        <ConfirmDialog rows={selectedRows} onCancel={() => setConfirming(false)} />
      ) : null}
    </>
  );
}
