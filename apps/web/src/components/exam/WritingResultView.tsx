"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, PenLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  ExaminerFeedback,
  WritingTaskGrid,
  type WritingTaskDetail
} from "@/components/exam/WritingScoreDetail";

export function WritingResultView({
  examTitle,
  band,
  tasks,
  feedback
}: {
  examTitle: string;
  band: number;
  tasks: WritingTaskDetail[];
  feedback: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Card className="p-8 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <PenLine className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Writing evaluated
        </h1>
        <p className="mt-1 text-sm text-muted">{examTitle}</p>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Writing band</p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="group mx-auto mt-1 flex flex-col items-center rounded-xl px-4 py-1 transition-colors hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <span className="text-5xl font-bold text-brand-700">{band.toFixed(1)}</span>
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
            {open ? "Hide detailed scores" : "Tap for detailed scores"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </span>
        </button>
        <div className="mt-6 flex justify-center">
          <Link href="/play">
            <Button variant="outline">Back to exams</Button>
          </Link>
        </div>
      </Card>

      {open ? (
        <Card className="mt-5 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Detailed scores
          </h2>
          <WritingTaskGrid tasks={tasks} />
        </Card>
      ) : null}

      <ExaminerFeedback items={feedback && feedback.trim() ? [{ text: feedback }] : []} />
    </div>
  );
}
