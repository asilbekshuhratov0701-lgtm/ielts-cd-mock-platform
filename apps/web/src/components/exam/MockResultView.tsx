"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, ChevronDown, Headphones, PenLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Criteria = {
  taskResponse: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammaticalRange: number;
};
type WritingTask = { taskNumber: number; taskBand: number; criteria: Criteria };

export type MockPartView = {
  module: string;
  title: string;
  band: number | null;
  raw?: number;
  total?: number;
  writing?: { tasks: WritingTask[]; feedback: string | null } | null;
};

const CRIT: { label: string; k: keyof Criteria }[] = [
  { label: "Task Response", k: "taskResponse" },
  { label: "Coherence & Cohesion", k: "coherenceCohesion" },
  { label: "Lexical Resource", k: "lexicalResource" },
  { label: "Grammatical Range", k: "grammaticalRange" }
];

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
  const feedbacks = parts.filter((p) => p.writing?.feedback && p.writing.feedback.trim());

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
                <div className="space-y-3">
                  {p.writing.tasks.map((t) => (
                    <div key={t.taskNumber}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">Task {t.taskNumber}</span>
                        <span className="text-muted">band {t.taskBand.toFixed(1)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {CRIT.map((c) => (
                          <div
                            key={c.k}
                            className="rounded-md bg-brand-50/50 px-2 py-1.5 text-center"
                          >
                            <div className="text-[11px] leading-tight text-muted">{c.label}</div>
                            <div className="mt-0.5 text-sm font-semibold text-foreground">
                              {t.criteria[c.k].toFixed(1)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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

      {feedbacks.length > 0 ? (
        <Card className="mt-5 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <PenLine className="h-4 w-4 text-brand-600" /> Examiner feedback
          </h2>
          <div className="space-y-4">
            {feedbacks.map((p, i) => (
              <div key={i}>
                {feedbacks.length > 1 ? (
                  <div className="mb-1 text-xs font-medium capitalize text-muted">
                    {p.module} · {p.title}
                  </div>
                ) : null}
                <p className="whitespace-pre-wrap rounded-lg bg-brand-50/40 p-3 text-sm leading-relaxed text-foreground/90">
                  {p.writing!.feedback}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
