"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, ChevronDown, Headphones, PenLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  ExaminerFeedback,
  WritingTaskGrid,
  type WritingTaskDetail
} from "@/components/exam/WritingScoreDetail";

export type MockPartView = {
  module: string;
  title: string;
  band: number | null;
  raw?: number;
  total?: number;
  writing?: { tasks: WritingTaskDetail[]; feedback: string | null } | null;
};

const moduleIcon: Record<string, ReactNode> = {
  listening: <Headphones className="h-4 w-4 text-brand-600" />,
  reading: <BookOpen className="h-4 w-4 text-brand-600" />,
  writing: <PenLine className="h-4 w-4 text-brand-600" />
};

const fmt = (b: number | null) => (b === null ? "—" : b.toFixed(1));

export function MockResultView({
  examTitle,
  overall,
  parts
}: {
  examTitle: string;
  overall: number | null;
  parts: MockPartView[];
}) {
  const [open, setOpen] = useState(false);
  const feedbackParts = parts.filter((p) => p.writing?.feedback && p.writing.feedback.trim());
  const feedbackItems = feedbackParts.map((p) => ({
    label: feedbackParts.length > 1 ? `${p.module} · ${p.title}` : undefined,
    text: p.writing!.feedback!
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Card className="p-8 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">Mock completed</h1>
        <p className="mt-1 text-sm text-muted">{examTitle}</p>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Overall band</p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="group mx-auto mt-1 flex flex-col items-center rounded-xl px-4 py-1 transition-colors hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <span className="text-5xl font-bold text-brand-700">{fmt(overall)}</span>
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

      {parts.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parts.map((p, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                {moduleIcon[p.module] ?? null}
                <span className="capitalize">{p.module}</span>
              </div>
              {p.module === "writing" && p.band === null ? (
                <p className="mt-2 text-2xl font-bold text-muted">
                  —
                  <span className="ml-2 align-middle text-xs font-normal">
                    examiner-marked (pending)
                  </span>
                </p>
              ) : (
                <>
                  <p className="mt-2 text-3xl font-bold text-brand-700">{fmt(p.band)}</p>
                  <p className="text-xs text-muted">
                    {p.module === "writing"
                      ? "examiner-marked"
                      : `${p.raw ?? 0} / ${p.total ?? 0} correct`}
                  </p>
                </>
              )}
            </Card>
          ))}
        </div>
      ) : null}

      {open ? (
        <Card className="mt-5 space-y-5 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Detailed scores</h2>
          {parts.map((p, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  {moduleIcon[p.module] ?? null}
                  <span className="capitalize">{p.module}</span>
                  <span className="text-sm font-normal text-muted">{p.title}</span>
                </div>
                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-sm font-semibold text-brand-700">
                  Band {fmt(p.band)}
                </span>
              </div>
              {p.writing ? (
                <WritingTaskGrid tasks={p.writing.tasks} />
              ) : (
                <p className="text-sm text-muted">
                  {p.raw ?? 0} / {p.total ?? 0} correct
                  {typeof p.total === "number" && p.total > 0
                    ? ` · ${Math.round(((p.raw ?? 0) / p.total) * 100)}%`
                    : ""}
                </p>
              )}
            </div>
          ))}
        </Card>
      ) : null}

      <ExaminerFeedback items={feedbackItems} />
    </div>
  );
}
