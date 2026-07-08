"use client";

import { useActionState } from "react";
import { UploadCloud } from "lucide-react";
import { importCandidatesAction } from "@/lib/candidate-admin-actions";
import { EMPTY_IMPORT_RESULT } from "@/lib/candidate-admin-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function CandidateImportPanel() {
  const [state, action, pending] = useActionState(importCandidatesAction, EMPTY_IMPORT_RESULT);

  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".csv,.json,.xlsx,.xls,text/csv,application/json"
          required
          className="max-w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
        />
        <Button type="submit" disabled={pending}>
          <UploadCloud className="h-4 w-4" /> {pending ? "Importing…" : "Import candidates"}
        </Button>
      </div>
      <p className="text-xs text-muted">
        Accepts <strong>CSV, JSON, or Excel</strong>. Columns: <code>email</code> (required),{" "}
        <code>name</code>, <code>password</code>, <code>group</code>, <code>phone</code>,{" "}
        <code>country</code>, <code>target</code>. New groups are created automatically; missing
        passwords are generated.
      </p>

      {state.message ? (
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            state.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          )}
        >
          {state.message}
        </div>
      ) : null}

      {state.generated.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Generated passwords ({state.generated.length}) — copy &amp; share now, they are not stored in plain text
          </p>
          <div className="max-h-40 overflow-auto font-mono text-xs text-foreground">
            {state.generated.map((g) => (
              <div key={g.email}>
                {g.email} — {g.password}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {state.errors.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <p className="mb-1 font-semibold">Skipped rows ({state.errors.length})</p>
          <div className="max-h-32 overflow-auto">
            {state.errors.map((error, i) => (
              <div key={i}>{error}</div>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
