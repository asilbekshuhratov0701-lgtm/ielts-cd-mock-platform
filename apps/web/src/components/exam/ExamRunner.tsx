"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Clock, Flag, Loader2 } from "lucide-react";
import type { RunnerState } from "@/lib/exam";
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

  const allQuestions = current.groups.flatMap((g) => g.questions);
  const isAnswered = (id: string) => {
    const v = answers[id];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  };
  const answeredCount = allQuestions.filter((q) => isAnswered(q.id)).length;

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
              : current.groups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-2xl border border-border bg-surface p-5 shadow-soft"
                  >
                    <p className="mb-4 text-sm font-medium text-muted">{group.instructions}</p>
                    <div className="space-y-4">
                      {group.questions.map((q) => (
                        <div key={q.id} className="rounded-xl border border-border p-4">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <p className="text-sm text-foreground">
                              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-xs font-semibold text-brand-700">
                                {q.number}
                              </span>
                              {q.prompt}
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
                          <QuestionInput
                            question={q}
                            value={answers[q.id]}
                            onChange={(v) => onAnswer(q.id, v)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <span className="text-sm text-muted">
            {current.kind === "WRITING"
              ? `${current.writingTasks.length} task(s)`
              : `${answeredCount} / ${allQuestions.length} answered`}
          </span>
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

function QuestionInput({
  question,
  value,
  onChange
}: {
  question: { id: string; answerType: string; options: { value: string; label: string }[] };
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (question.answerType === "SINGLE" && question.options.length > 0) {
    return (
      <div className="space-y-1.5">
        {question.options.map((opt) => {
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
