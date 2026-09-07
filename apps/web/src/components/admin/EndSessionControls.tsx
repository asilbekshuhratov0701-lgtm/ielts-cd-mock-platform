"use client";

import { useEffect, useState } from "react";
import { createPortal, useFormStatus } from "react-dom";
import { AlertTriangle, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { endAttemptAction, discardAttemptAction } from "@/lib/live-actions";

type Mode = "end" | "discard";

export interface EndSessionTarget {
  attemptId: string;
  candidate: string;
  examTitle: string;
  skill: string;
  answered: number;
  totalQuestions: number;
  isMock: boolean;
}

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={mode === "discard" ? "destructive" : "primary"}
      disabled={pending}
    >
      {mode === "discard" ? (
        <>
          <Trash2 className="h-3.5 w-3.5" />
          {pending ? "Discarding…" : "Discard session"}
        </>
      ) : (
        <>
          <Square className="h-3.5 w-3.5" />
          {pending ? "Ending…" : "End session"}
        </>
      )}
    </Button>
  );
}

function ConfirmDialog({
  mode,
  target,
  onCancel
}: {
  mode: Mode;
  target: EndSessionTarget;
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

  if (!mounted) return null;

  const discard = mode === "discard";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={discard ? "Confirm session discard" : "Confirm session end"}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
    >
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              discard ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-700"
            }`}
          >
            {discard ? <AlertTriangle className="h-5 w-5" /> : <Square className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              {discard ? "Discard" : "End"} {target.candidate}&apos;s session?
            </h2>
            <p className="mt-1 text-sm text-muted">
              {target.examTitle} — {target.skill}, {target.answered}/{target.totalQuestions}{" "}
              answered.
            </p>
          </div>
        </div>

        <ul
          className={`mt-4 space-y-1.5 rounded-lg p-3 text-sm ${
            discard ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"
          }`}
        >
          {discard ? (
            <>
              <li>The attempt and every answer in it are deleted for good.</li>
              <li>Nothing is scored and nothing shows up in results or exports.</li>
              <li>
                {target.isMock
                  ? "The whole mock attempt goes, including the other skills in it — the candidate can start the mock from scratch."
                  : "The candidate can start this exam again."}
              </li>
            </>
          ) : (
            <>
              <li>The clock stops now and the candidate cannot write any more.</li>
              <li>
                The {target.answered} answer{target.answered === 1 ? "" : "s"} already saved are
                scored, and the attempt is recorded as submitted.
              </li>
              <li>
                {target.isMock
                  ? "The rest of the mock is closed too — unstarted skills are recorded with no answers."
                  : "It appears in results like any finished attempt."}
              </li>
            </>
          )}
        </ul>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <form action={discard ? discardAttemptAction : endAttemptAction}>
            <input type="hidden" name="attemptId" value={target.attemptId} />
            <SubmitButton mode={mode} />
          </form>
        </div>
      </Card>
    </div>,
    document.body
  );
}

export function EndSessionControls({ target }: { target: EndSessionTarget }) {
  const [mode, setMode] = useState<Mode | null>(null);

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setMode("end")}>
        <Square className="h-3.5 w-3.5" /> End
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => setMode("discard")}
      >
        <Trash2 className="h-3.5 w-3.5" /> Discard
      </Button>

      {mode ? (
        <ConfirmDialog mode={mode} target={target} onCancel={() => setMode(null)} />
      ) : null}
    </>
  );
}
