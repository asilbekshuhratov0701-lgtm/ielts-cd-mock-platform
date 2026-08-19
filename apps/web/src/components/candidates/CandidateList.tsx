"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal, useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertTriangle, Pencil, Search, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { resetPasswordAction, setStatusAction } from "@/lib/admin-users-actions";
import { updateCandidateAction, deleteCandidatesAction } from "@/lib/candidate-admin-actions";

export interface CandidateRow {
  id: string;
  name: string | null;
  email: string;
  status: string;
  phone: string | null;
  country: string | null;
  targetBand: number | null;
  groups: { id: string; name: string }[];
  mockAttempts: number;
  sectionAttempts: number;
}

const fieldLabel = "text-xs font-medium text-muted";

function DeleteSubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : `Delete ${count}`}
    </Button>
  );
}

function ConfirmDialog({ rows, onCancel }: { rows: CandidateRow[]; onCancel: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const mockAttempts = rows.reduce((n, r) => n + r.mockAttempts, 0);
  const sectionAttempts = rows.reduce((n, r) => n + r.sectionAttempts, 0);
  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm candidate deletion"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
    >
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              Delete {rows.length} candidate{rows.length === 1 ? "" : "s"}?
            </h2>
            <p className="mt-1 text-sm text-muted">
              This removes the account itself. It cannot be undone.
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <li>
            <strong>{mockAttempts}</strong> mock attempt{mockAttempts === 1 ? "" : "s"} and{" "}
            <strong>{sectionAttempts}</strong> section attempt
            {sectionAttempts === 1 ? "" : "s"} — every answer, mark and band they hold
          </li>
          <li>Their group memberships and exam assignments</li>
          <li>They disappear from results and exports, so past reports will not match</li>
        </ul>

        <ul className="mt-4 max-h-48 overflow-auto rounded-lg border border-border text-sm">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0"
            >
              <span className="truncate font-medium text-foreground">{r.name ?? r.email}</span>
              <span className="shrink-0 text-xs text-muted">{r.email}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <form action={deleteCandidatesAction}>
            {rows.map((r) => (
              <input key={r.id} type="hidden" name="candidateId" value={r.id} />
            ))}
            <DeleteSubmitButton count={rows.length} />
          </form>
        </div>
      </Card>
    </div>,
    document.body
  );
}

export function CandidateList({ candidates }: { candidates: CandidateRow[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const headerBox = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) =>
      `${c.name ?? ""} ${c.email} ${c.groups.map((g) => g.name).join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  }, [candidates, query]);

  const visibleIds = useMemo(() => visible.map((c) => c.id), [visible]);
  const selectedVisible = visibleIds.filter((id) => selected.has(id));
  const allVisibleSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const selectedRows = useMemo(
    () => candidates.filter((c) => selected.has(c.id)),
    [candidates, selected]
  );

  useEffect(() => {
    if (headerBox.current) {
      headerBox.current.indeterminate =
        selectedVisible.length > 0 && selectedVisible.length < visibleIds.length;
    }
  }, [selectedVisible.length, visibleIds.length]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email or group…"
            aria-label="Search candidates"
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            ref={headerBox}
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleAllVisible}
            disabled={visibleIds.length === 0}
            className="h-4 w-4 rounded border-border text-brand-600"
          />
          Select all
        </label>
        <span className="text-xs text-muted">
          {visible.length} of {candidates.length}
        </span>
      </div>

      {selectedRows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
          <span className="text-sm font-medium text-brand-800">
            {selectedRows.length} selected
            {selectedRows.length !== selectedVisible.length
              ? ` (${selectedRows.length - selectedVisible.length} hidden by search)`
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

      {visible.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">Nothing matches that search.</Card>
      ) : (
        <div className="space-y-3">
          {visible.map((candidate) => {
            const checked = selected.has(candidate.id);
            return (
              <Card
                key={candidate.id}
                className={cn("p-4", checked && "border-brand-300 bg-brand-50/40")}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(candidate.id)}
                      aria-label={`Select ${candidate.name ?? candidate.email}`}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-border text-brand-600"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/candidates/${candidate.id}`}
                          className="font-medium text-foreground hover:text-brand-700 hover:underline"
                        >
                          {candidate.name ?? candidate.email}
                        </Link>
                        <Badge variant={candidate.status === "ACTIVE" ? "success" : "danger"}>
                          {candidate.status}
                        </Badge>
                        {candidate.groups.map((g) => (
                          <Badge key={g.id} variant="muted">
                            {g.name}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {candidate.email} · {candidate.mockAttempts} mock attempt
                        {candidate.mockAttempts === 1 ? "" : "s"}
                        {candidate.phone ? ` · ${candidate.phone}` : ""}
                        {candidate.targetBand ? ` · target ${candidate.targetBand}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/candidates/${candidate.id}`}>
                      <Button variant="outline" size="sm">
                        Results
                      </Button>
                    </Link>
                    <form action={resetPasswordAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="userId" value={candidate.id} />
                      <Input
                        name="password"
                        type="text"
                        minLength={8}
                        placeholder="new password"
                        className="h-9 w-32"
                      />
                      <Button type="submit" variant="ghost" size="sm">
                        Reset
                      </Button>
                    </form>
                    <form action={setStatusAction}>
                      <input type="hidden" name="userId" value={candidate.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={candidate.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}
                      />
                      <Button type="submit" variant="ghost" size="sm">
                        {candidate.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </Button>
                    </form>
                  </div>
                </div>

                <details className="mt-3 border-t border-border pt-3">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-brand-600 [&::-webkit-details-marker]:hidden">
                    <Pencil className="h-3.5 w-3.5" /> Edit profile
                  </summary>
                  <form action={updateCandidateAction} className="mt-3 grid gap-3 sm:grid-cols-3">
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <label className="space-y-1">
                      <span className={fieldLabel}>Name</span>
                      <Input name="name" defaultValue={candidate.name ?? ""} />
                    </label>
                    <label className="space-y-1">
                      <span className={fieldLabel}>Email</span>
                      <Input name="email" type="email" defaultValue={candidate.email} />
                    </label>
                    <label className="space-y-1">
                      <span className={fieldLabel}>Phone</span>
                      <Input name="phone" defaultValue={candidate.phone ?? ""} />
                    </label>
                    <label className="space-y-1">
                      <span className={fieldLabel}>Country</span>
                      <Input name="country" defaultValue={candidate.country ?? ""} />
                    </label>
                    <label className="space-y-1">
                      <span className={fieldLabel}>Target band</span>
                      <Input
                        name="targetBand"
                        inputMode="decimal"
                        defaultValue={candidate.targetBand?.toString() ?? ""}
                      />
                    </label>
                    <div className="flex items-end">
                      <Button type="submit" size="sm" variant="secondary">
                        Save changes
                      </Button>
                    </div>
                  </form>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelected(new Set([candidate.id]));
                      setConfirming(true);
                    }}
                    className="mt-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete candidate
                  </Button>
                </details>
              </Card>
            );
          })}
        </div>
      )}

      {confirming && selectedRows.length > 0 ? (
        <ConfirmDialog rows={selectedRows} onCancel={() => setConfirming(false)} />
      ) : null}
    </>
  );
}
