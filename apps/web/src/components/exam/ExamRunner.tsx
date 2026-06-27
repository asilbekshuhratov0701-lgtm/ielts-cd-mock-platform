"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, Check, ChevronRight, Clock, Flag, Loader2, X } from "lucide-react";
import type { RunnerQuestion, RunnerState } from "@/lib/exam";
import { layoutGapNumbers, type CompletionLayout, type LayoutCell } from "@/lib/completion-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type SaveStatus = "idle" | "saving" | "saved" | "error";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

export function ExamRunner({ initial }: { initial: RunnerState }) {
  const router = useRouter();
  const current = initial.current!;
  const attemptId = initial.attemptId;

  const sortedSections = useMemo(
    () => [...initial.sections].sort((a, b) => a.order - b.order),
    [initial.sections]
  );
  const currentMeta = sortedSections.find((s) => s.id === current.sectionId);
  const currentIndex = sortedSections.findIndex((s) => s.id === current.sectionId);
  const isLast = !sortedSections.some((s) => (currentMeta ? s.order > currentMeta.order : false));

  const [answers, setAnswers] = useState<Record<string, unknown>>(current.answers);
  const [flags, setFlags] = useState<Record<string, boolean>>(current.flags);
  const [writing, setWriting] = useState<Record<number, string>>(current.writing);
  const [remaining, setRemaining] = useState<number>(current.remainingSec);
  const [save, setSave] = useState<SaveStatus>("idle");
  const [busy, setBusy] = useState(false);
  const [activeQ, setActiveQ] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  const offsetRef = useRef(Date.parse(initial.serverNow) - Date.now());
  const deadlineMs = useMemo(() => Date.parse(current.deadlineAt), [current.deadlineAt]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const advancingRef = useRef(false);

  const advance = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setBusy(true);
    await postJson(`/api/v1/attempts/${attemptId}/advance`, {});
    router.refresh();
  }, [attemptId, router]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now() + offsetRef.current;
      const rem = Math.max(0, Math.round((deadlineMs - now) / 1000));
      setRemaining(rem);
      if (rem <= 0) void advance();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineMs, advance]);

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await postJson(`/api/v1/attempts/${attemptId}/heartbeat`, {});
      const data = res.data as { remainingSec?: number; expired?: boolean } | null;
      if (data?.expired) void advance();
      else if (typeof data?.remainingSec === "number") setRemaining(data.remainingSec);
    }, 15000);
    return () => clearInterval(id);
  }, [attemptId, advance]);

  const saveAnswer = useCallback(
    (questionId: string, response: unknown, isFlagged: boolean) => {
      clearTimeout(timersRef.current[questionId]);
      timersRef.current[questionId] = setTimeout(async () => {
        setSave("saving");
        const res = await postJson(`/api/v1/attempts/${attemptId}/answers`, {
          questionId,
          response,
          isFlagged
        });
        setSave(res.ok ? "saved" : "error");
      }, 600);
    },
    [attemptId]
  );

  const saveWriting = useCallback(
    (taskNo: number, content: string) => {
      const key = `task-${taskNo}`;
      clearTimeout(timersRef.current[key]);
      timersRef.current[key] = setTimeout(async () => {
        setSave("saving");
        const res = await postJson(`/api/v1/attempts/${attemptId}/writing`, { taskNo, content });
        setSave(res.ok ? "saved" : "error");
      }, 800);
    },
    [attemptId]
  );

  const onAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    saveAnswer(questionId, value, flags[questionId] ?? false);
  };

  const onToggleFlag = (questionId: string) => {
    const next = !flags[questionId];
    setFlags((prev) => ({ ...prev, [questionId]: next }));
    saveAnswer(questionId, answers[questionId], next);
  };

  const onWriting = (taskNo: number, text: string) => {
    setWriting((prev) => ({ ...prev, [taskNo]: text }));
    saveWriting(taskNo, text);
  };

  const jumpTo = (id: string) => {
    setActiveQ(id);
    setShowReview(false);
    document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const allQuestions = current.groups.flatMap((g) => g.questions);
  const isAnswered = (id: string) => {
    const v = answers[id];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  };
  const answeredCount = allQuestions.filter((q) => isAnswered(q.id)).length;
  const flaggedCount = allQuestions.filter((q) => flags[q.id]).length;
  const unansweredList = allQuestions.filter((q) => !isAnswered(q.id));
  const flaggedList = allQuestions.filter((q) => flags[q.id]);

  const timerTone =
    remaining <= 60
      ? "bg-red-100 text-red-700"
      : remaining <= 300
        ? "bg-amber-100 text-amber-700"
        : "bg-brand-50 text-brand-700";

  const isReading = current.passages.length > 0 && current.kind !== "WRITING";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{initial.examTitle}</p>
            <p className="text-xs text-muted">
              {current.kind} · Section {currentIndex + 1} of {sortedSections.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
              {save === "saving" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : save === "saved" ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : null}
              {save === "saving"
                ? "Saving…"
                : save === "saved"
                  ? "Saved"
                  : save === "error"
                    ? "Save failed"
                    : ""}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-semibold tabular-nums",
                timerTone
              )}
            >
              <Clock className="h-4 w-4" />
              {formatTime(remaining)}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className={cn(isReading ? "grid gap-6 lg:grid-cols-2" : "mx-auto max-w-3xl")}>
          {isReading ? (
            <div className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-auto lg:pr-2">
              {current.passages.map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl border border-border bg-surface p-5 shadow-soft"
                >
                  {p.title ? (
                    <h2 className="mb-2 font-semibold text-brand-700">{p.title}</h2>
                  ) : null}
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                    {p.body}
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className="space-y-6">
            {current.kind === "WRITING"
              ? current.writingTasks.map((task) => {
                  const text = writing[task.taskNo] ?? "";
                  const wc = countWords(text);
                  return (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-border bg-surface p-5 shadow-soft"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h2 className="font-semibold text-brand-700">Task {task.taskNo}</h2>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            wc >= task.minWords
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-foreground/5 text-muted"
                          )}
                        >
                          {wc} / {task.minWords} words
                        </span>
                      </div>
                      <p className="mb-3 whitespace-pre-wrap text-sm text-muted">{task.prompt}</p>
                      <textarea
                        value={text}
                        spellCheck={false}
                        onChange={(e) => onWriting(task.taskNo, e.target.value)}
                        rows={14}
                        className="w-full rounded-lg border border-border bg-surface p-3 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                        placeholder="Write your response here…"
                      />
                    </div>
                  );
                })
              : current.groups.map((group) => {
                  const byNumber = new Map(
                    group.questions.map((q) => [q.number, q] as const)
                  );
                  const covered = group.layout ? layoutGapNumbers(group.layout) : null;
                  const stacked = covered
                    ? group.questions.filter((q) => !covered.has(q.number))
                    : group.questions;
                  return (
                  <div
                    key={group.id}
                    className="rounded-2xl border border-border bg-surface p-5 shadow-soft"
                  >
                    <p className="mb-4 text-sm font-medium text-muted">{group.instructions}</p>
                    {group.layout ? (
                      <LayoutView
                        layout={group.layout}
                        byNumber={byNumber}
                        answers={answers}
                        activeQ={activeQ}
                        onAnswer={onAnswer}
                      />
                    ) : null}
                    <div className="space-y-4">
                      {stacked.map((q) => {
                        const inlineGap = q.answerType === "TEXT" && GAP_RE.test(q.prompt);
                        return (
                          <div
                            key={q.id}
                            id={`q-${q.id}`}
                            className={cn(
                              "scroll-mt-24 rounded-xl border p-4 transition-colors",
                              activeQ === q.id
                                ? "border-brand-400 ring-2 ring-brand-200"
                                : "border-border"
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-start justify-between gap-3",
                                !inlineGap && "mb-3"
                              )}
                            >
                              <p className="text-sm leading-relaxed text-foreground">
                                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-xs font-semibold text-brand-700">
                                  {q.number}
                                </span>
                                {inlineGap ? (
                                  <GapPrompt
                                    prompt={q.prompt}
                                    number={q.number}
                                    value={answers[q.id]}
                                    onChange={(v) => onAnswer(q.id, v)}
                                  />
                                ) : (
                                  q.prompt
                                )}
                              </p>
                              <button
                                type="button"
                                onClick={() => onToggleFlag(q.id)}
                                title="Flag for review"
                                className={cn(
                                  "shrink-0 rounded-lg p-1.5 transition-colors",
                                  flags[q.id]
                                    ? "bg-amber-100 text-amber-700"
                                    : "text-muted hover:bg-brand-50 hover:text-brand-700"
                                )}
                              >
                                <Flag className="h-4 w-4" />
                              </button>
                            </div>
                            {!inlineGap ? (
                              <QuestionInput
                                question={q}
                                groupType={group.type}
                                value={answers[q.id]}
                                onChange={(v) => onAnswer(q.id, v)}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
          </div>
        </div>
      </main>

      <footer className="sticky bottom-0 z-20 border-t border-border bg-surface/90 backdrop-blur">
        {showReview && current.kind !== "WRITING" ? (
          <div className="mx-auto max-w-6xl px-6 pt-4">
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Review your answers</h3>
                <button
                  type="button"
                  onClick={() => setShowReview(false)}
                  className="rounded-lg p-1 text-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
                  title="Close review"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                    Not answered ({unansweredList.length})
                  </p>
                  {unansweredList.length === 0 ? (
                    <p className="text-sm text-emerald-700">All questions answered.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {unansweredList.map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => jumpTo(q.id)}
                          className="h-8 w-8 rounded-md border border-border text-xs font-semibold text-foreground transition-colors hover:border-brand-300 hover:bg-brand-50"
                        >
                          {q.number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                    Flagged for review ({flaggedList.length})
                  </p>
                  {flaggedList.length === 0 ? (
                    <p className="text-sm text-muted">No flagged questions.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {flaggedList.map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => jumpTo(q.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200"
                        >
                          {q.number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {current.kind !== "WRITING" ? (
          <div className="mx-auto max-w-6xl overflow-x-auto px-6 pt-2">
            <div className="flex gap-1.5 pb-1">
              {allQuestions.map((q) => {
                const answered = isAnswered(q.id);
                const flagged = flags[q.id];
                const active = activeQ === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => jumpTo(q.id)}
                    title={flagged ? `Question ${q.number} · flagged` : `Question ${q.number}`}
                    className={cn(
                      "relative h-8 w-8 shrink-0 rounded-md border text-xs font-semibold transition-colors",
                      answered
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-border text-muted hover:border-brand-300 hover:bg-brand-50",
                      active && "ring-2 ring-brand-300"
                    )}
                  >
                    {q.number}
                    {flagged ? (
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3 text-sm text-muted">
            {current.kind === "WRITING" ? (
              <span>{current.writingTasks.length} task(s)</span>
            ) : (
              <>
                <span className="tabular-nums">
                  {answeredCount} / {allQuestions.length} answered
                </span>
                {flaggedCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <Flag className="h-3.5 w-3.5" />
                    {flaggedCount}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowReview((v) => !v)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-sm font-medium transition-colors",
                    showReview ? "bg-brand-100 text-brand-700" : "text-brand-700 hover:bg-brand-50"
                  )}
                >
                  Review
                </button>
              </>
            )}
          </div>
          <Button
            onClick={() => void advance()}
            disabled={busy}
            variant={isLast ? "success" : "primary"}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLast ? "Finish & submit" : "Next section"}
            {!busy ? <ChevronRight className="h-4 w-4" /> : null}
          </Button>
        </div>
      </footer>
    </div>
  );
}

type LayoutCellProps = {
  cell: LayoutCell;
  byNumber: Map<number, RunnerQuestion>;
  answers: Record<string, unknown>;
  activeQ: string | null;
  onAnswer: (questionId: string, value: unknown) => void;
};

function LayoutCellView({ cell, byNumber, answers, activeQ, onAnswer }: LayoutCellProps) {
  return (
    <>
      {cell.segs.map((seg, i) => {
        if ("text" in seg) return <span key={i}>{seg.text}</span>;
        const q = byNumber.get(seg.gap);
        if (!q)
          return (
            <span key={i} className="text-muted">
              [{seg.gap}]
            </span>
          );
        const value = answers[q.id];
        return (
          <input
            key={i}
            id={`q-${q.id}`}
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onAnswer(q.id, e.target.value)}
            aria-label={`Answer for question ${q.number}`}
            placeholder={String(q.number)}
            className={cn(
              "mx-1 inline-block h-8 w-28 scroll-mt-24 rounded-md border bg-surface px-2 align-middle text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
              activeQ === q.id ? "border-brand-400 ring-2 ring-brand-200" : "border-border"
            )}
          />
        );
      })}
    </>
  );
}

function LayoutView({
  layout,
  byNumber,
  answers,
  activeQ,
  onAnswer
}: {
  layout: CompletionLayout;
  byNumber: Map<number, RunnerQuestion>;
  answers: Record<string, unknown>;
  activeQ: string | null;
  onAnswer: (questionId: string, value: unknown) => void;
}) {
  const cellProps = { byNumber, answers, activeQ, onAnswer };

  if (layout.kind === "table") {
    return (
      <div className="mb-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {layout.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => {
                  const Tag = cell.header ? "th" : "td";
                  return (
                    <Tag
                      key={c}
                      className={cn(
                        "border border-border px-3 py-2 align-middle leading-relaxed",
                        cell.header
                          ? "bg-brand-50 text-left font-semibold text-brand-700"
                          : "text-foreground"
                      )}
                    >
                      <LayoutCellView cell={cell} {...cellProps} />
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {layout.steps.map((cell, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-full max-w-md rounded-xl border border-border bg-brand-50/40 px-4 py-3 text-center text-sm leading-relaxed text-foreground">
            <LayoutCellView cell={cell} {...cellProps} />
          </div>
          {i < layout.steps.length - 1 ? (
            <ArrowDown className="my-1 h-4 w-4 shrink-0 text-muted" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

const GAP_RE = /_{2,}/;

function GapPrompt({
  prompt,
  number,
  value,
  onChange
}: {
  prompt: string;
  number: number;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const parts = prompt.split(/(_{2,})/);
  let gapPlaced = false;
  return (
    <>
      {parts.map((part, i) => {
        if (!gapPlaced && /^_{2,}$/.test(part)) {
          gapPlaced = true;
          return (
            <input
              key={i}
              type="text"
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              aria-label={`Answer for question ${number}`}
              placeholder={String(number)}
              className="mx-1 inline-block h-8 w-36 rounded-md border border-border bg-surface px-2 align-middle text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

const FIXED_CHOICES: Record<string, { value: string; label: string }[]> = {
  TRUE_FALSE_NOT_GIVEN: [
    { value: "TRUE", label: "TRUE" },
    { value: "FALSE", label: "FALSE" },
    { value: "NOT_GIVEN", label: "NOT GIVEN" }
  ],
  YES_NO_NOT_GIVEN: [
    { value: "YES", label: "YES" },
    { value: "NO", label: "NO" },
    { value: "NOT_GIVEN", label: "NOT GIVEN" }
  ]
};

function QuestionInput({
  question,
  groupType,
  value,
  onChange
}: {
  question: { id: string; answerType: string; options: { value: string; label: string }[] };
  groupType: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const fixedChoices = question.options.length === 0 ? FIXED_CHOICES[groupType] : undefined;
  const radioChoices =
    question.answerType === "SINGLE" && question.options.length > 0
      ? question.options
      : (fixedChoices ?? null);

  if (radioChoices) {
    return (
      <div className="space-y-1.5">
        {radioChoices.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                selected
                  ? "border-brand-300 bg-brand-50 text-brand-800"
                  : "border-border hover:bg-brand-50/50"
              )}
            >
              <input
                type="radio"
                name={question.id}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="text-brand-600"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    );
  }

  if (question.answerType === "MULTI" && question.options.length > 0) {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-1.5">
        {question.options.map((opt) => {
          const checked = selected.includes(opt.value);
          return (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                checked
                  ? "border-brand-300 bg-brand-50 text-brand-800"
                  : "border-border hover:bg-brand-50/50"
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked ? selected.filter((v) => v !== opt.value) : [...selected, opt.value]
                  )
                }
                className="rounded text-brand-600"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    );
  }

  if (
    (question.answerType === "DROPDOWN" || question.answerType === "MATCH") &&
    question.options.length > 0
  ) {
    const selected = typeof value === "string" ? value : "";
    return (
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 w-full max-w-sm rounded-lg border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
          selected ? "border-brand-300 text-brand-800" : "border-border"
        )}
      >
        <option value="">Choose…</option>
        {question.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type="text"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full max-w-sm rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      placeholder="Your answer"
    />
  );
}
