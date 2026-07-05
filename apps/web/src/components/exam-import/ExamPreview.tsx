"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Play, Sun, Volume2 } from "lucide-react";
import type { PreviewExam, PreviewSection } from "@/lib/exam-import-map";
import type { AnswersMap } from "@/components/question-engine/types";
import { AnswersProvider, useAnswers } from "@/components/question-engine/answers-store";
import { QuestionGroupRenderer } from "@/components/question-engine/QuestionGroupRenderer";
import { saveBlueprintAnswers, submitBlueprintAttemptAction } from "@/lib/blueprint-play-actions";
import { submitMockPartAction } from "@/lib/mock-actions";
import { cn } from "@/lib/cn";

export interface LiveAttempt {
  attemptId: string;
  deadlineAt: string;
  serverNow: string;
  initialAnswers: AnswersMap;
  mock?: { mockAttemptId: string; index: number; count: number };
}

type Entry = { number: number; key: string; multi: boolean; section: number };

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Autosaver({ attemptId }: { attemptId: string }) {
  const answers = useAnswers();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveBlueprintAnswers(attemptId, answers);
    }, 800);
    return () => clearTimeout(timer.current);
  }, [answers, attemptId]);
  return null;
}

function buildEntries(exam: PreviewExam): Entry[] {
  const out: Entry[] = [];
  exam.sections.forEach((section, si) => {
    for (const g of section.groups) {
      if (g.inputKind === "radio") {
        for (const q of g.questions ?? []) out.push({ number: q.number, key: q.id, multi: false, section: si });
        for (const r of g.rows ?? []) out.push({ number: r.number, key: r.id, multi: false, section: si });
      } else if (g.inputKind === "gap") {
        for (const gap of g.gaps) out.push({ number: gap.number, key: gap.id, multi: false, section: si });
      } else if (g.inputKind === "select") {
        for (const p of g.prompts) out.push({ number: p.number, key: p.id, multi: false, section: si });
      } else {
        for (let n = g.numberRange[0]; n <= g.numberRange[1]; n += 1) {
          out.push({ number: n, key: g.id, multi: true, section: si });
        }
      }
    }
  });
  return out.sort((a, b) => a.number - b.number);
}

function isAnswered(answers: AnswersMap, e: Entry): boolean {
  const v = answers[e.key];
  if (e.multi) return Array.isArray(v) && v.length > 0;
  return v !== null && v !== undefined && v !== "";
}

function TopBar({
  exam,
  audioUrl,
  audioStarted,
  onStartAudio,
  volume,
  onVolume,
  remaining,
  onFinish,
  partProgress,
  finishLabel,
  isFullscreen,
  onToggleFullscreen
}: {
  exam: PreviewExam;
  audioUrl: string | null;
  audioStarted: boolean;
  onStartAudio: () => void;
  volume: number;
  onVolume: (v: number) => void;
  remaining: number | null;
  onFinish?: () => void;
  partProgress?: { index: number; count: number };
  finishLabel?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const timerLabel =
    remaining !== null
      ? `${formatClock(remaining)} left`
      : exam.timerSource === "fixed"
        ? `${exam.timeLimitMinutes ?? 60} minutes left`
        : "Audio timed";
  const lowTime = remaining !== null && remaining <= 300;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-surface px-5 py-2.5">
      <span className="flex items-center gap-2">
        <span className="text-sm font-bold uppercase tracking-wide text-foreground">
          {exam.module}
        </span>
        {partProgress ? (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
            Part {partProgress.index + 1} of {partProgress.count}
          </span>
        ) : null}
      </span>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium tabular-nums",
            lowTime ? "bg-red-100 text-red-700" : "bg-black/[0.05] text-foreground"
          )}
        >
          {timerLabel}
        </span>
        {exam.module === "listening" ? (
          audioStarted ? (
            <span className="flex items-center gap-1.5">
              <Volume2 className="h-4 w-4 text-muted" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => onVolume(Number(e.target.value))}
                className="h-1 w-24 accent-violet-600"
                aria-label="Volume"
              />
            </span>
          ) : (
            <button
              type="button"
              onClick={onStartAudio}
              disabled={!audioUrl}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium",
                audioUrl
                  ? "bg-violet-600 text-white hover:bg-violet-700"
                  : "cursor-not-allowed bg-black/[0.05] text-muted"
              )}
            >
              <Play className="h-3.5 w-3.5" /> Start audio
            </button>
          )
        ) : null}
        <button
          type="button"
          onClick={() => document.documentElement.classList.toggle("dark")}
          className="rounded-md p-1.5 text-muted hover:bg-black/[0.05]"
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4" />
        </button>
        {onToggleFullscreen ? (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="rounded-md p-1.5 text-muted hover:bg-black/[0.05]"
            aria-label="Toggle full screen"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onFinish}
          className="rounded-md bg-red-500 px-4 py-1 text-sm font-semibold text-white hover:bg-red-600"
        >
          {finishLabel ?? "Finish"}
        </button>
      </div>
    </div>
  );
}

function PartBanner({ index, from, to }: { index: number; from: number; to: number }) {
  return (
    <div className="border-b border-border bg-black/[0.03] px-6 py-3">
      <p className="text-sm font-bold text-foreground">Part {index + 1}</p>
      <p className="text-sm text-foreground/70">
        Read the text and answer questions {from} - {to}.
      </p>
    </div>
  );
}

function PassagePane({ section, index }: { section: PreviewSection; index: number }) {
  return (
    <div className="h-full overflow-auto px-6 py-5">
      <h2 className="text-lg font-bold uppercase text-foreground">
        {section.title || `Reading Passage ${index + 1}`}
      </h2>
      {section.subtitle ? (
        <p className="mt-3 text-base font-bold italic text-foreground">{section.subtitle}</p>
      ) : null}
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/85">
        {section.passageBlocks.map((b, i) => (
          <p key={i}>
            {b.label ? <span className="mr-2 font-semibold text-foreground">{b.label}</span> : null}
            {b.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function GroupsPane({ section }: { section: PreviewSection }) {
  return (
    <div className="flex flex-col gap-[var(--space-group)] px-6 py-5">
      {section.groups.map((g) => (
        <QuestionGroupRenderer key={g.id} group={g} />
      ))}
    </div>
  );
}

function ReadingBody({
  section,
  index,
  fill
}: {
  section: PreviewSection;
  index: number;
  fill?: boolean;
}) {
  const [leftPct, setLeftPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  return (
    <div ref={containerRef} className={cn("flex", fill ? "h-full" : "h-[70vh]")}>
      <div style={{ width: `${leftPct}%` }} className="h-full border-r border-border">
        <PassagePane section={section} index={index} />
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current || !containerRef.current) return;
          const r = containerRef.current.getBoundingClientRect();
          const pct = ((e.clientX - r.left) / r.width) * 100;
          setLeftPct(Math.min(70, Math.max(30, pct)));
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        className="w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-violet-400"
      />
      <div className="h-full flex-1 overflow-auto">
        <GroupsPane section={section} />
      </div>
    </div>
  );
}

function ListeningBody({
  section,
  index,
  fill
}: {
  section: PreviewSection;
  index: number;
  fill?: boolean;
}) {
  return (
    <div className={cn("overflow-auto", fill ? "h-full" : "h-[70vh]")}>
      <div className="mx-auto max-w-3xl px-6 py-5">
        <p className="mb-3 text-sm font-bold uppercase text-foreground">Part {index + 1}</p>
        {section.scenario ? (
          <p className="mb-3 text-sm italic text-muted">{section.scenario}</p>
        ) : null}
        <div className="flex flex-col gap-[var(--space-group)]">
          {section.groups.map((g) => (
            <QuestionGroupRenderer key={g.id} group={g} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NavCell({
  n,
  active,
  answered,
  onClick
}: {
  n: number;
  active: boolean;
  answered: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 w-7 shrink-0 rounded-full border text-xs font-semibold transition-colors",
        active
          ? "border-violet-600 bg-violet-600 text-white"
          : answered
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-border text-muted hover:border-violet-300"
      )}
    >
      {n}
    </button>
  );
}

function BottomNav({
  exam,
  entries,
  answers,
  activeNum,
  onPick,
  onStep
}: {
  exam: PreviewExam;
  entries: Entry[];
  answers: AnswersMap;
  activeNum: number;
  onPick: (n: number) => void;
  onStep: (dir: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border bg-surface px-4 py-2">
      <div className="flex items-center gap-5 overflow-x-auto">
        {exam.sections.map((section, si) => {
          const partEntries = entries.filter((e) => e.section === si);
          if (partEntries.length === 0) return null;
          const answeredCount = partEntries.filter((e) => isAnswered(answers, e)).length;
          const isActive = partEntries.some((e) => e.number === activeNum);
          return (
            <div key={section.id} className="flex shrink-0 items-center gap-2">
              {isActive ? (
                <>
                  <span className="text-sm font-bold text-foreground">Part {si + 1}</span>
                  <div className="flex items-center gap-1.5">
                    {partEntries.map((e) => (
                      <NavCell
                        key={e.number}
                        n={e.number}
                        active={e.number === activeNum}
                        answered={isAnswered(answers, e)}
                        onClick={() => onPick(e.number)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onPick(partEntries[0]!.number)}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-black/[0.05]"
                >
                  <span className="font-bold text-foreground">Part {si + 1}</span>
                  <span className="text-muted">
                    {answeredCount} of {partEntries.length}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onStep(-1)}
          className="rounded-md bg-violet-700 p-2 text-white hover:bg-violet-800"
          aria-label="Previous question"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onStep(1)}
          className="rounded-md bg-violet-700 p-2 text-white hover:bg-violet-800"
          aria-label="Next question"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Shell({
  exam,
  audioUrl,
  live
}: {
  exam: PreviewExam;
  audioUrl: string | null;
  live?: LiveAttempt;
}) {
  const answers = useAnswers();
  const entries = useMemo(() => buildEntries(exam), [exam]);
  const orderedNums = useMemo(() => entries.map((e) => e.number), [entries]);
  const [activeNum, setActiveNum] = useState(orderedNums[0] ?? 1);

  const activeEntry = entries.find((e) => e.number === activeNum) ?? entries[0];
  const activePart = activeEntry?.section ?? 0;
  const section = exam.sections[activePart];
  const partEntries = entries.filter((e) => e.section === activePart);
  const partFrom = partEntries.length ? partEntries[0]!.number : 0;
  const partTo = partEntries.length ? partEntries[partEntries.length - 1]!.number : 0;

  const audioRef = useRef<HTMLAudioElement>(null);
  const maxRef = useRef(0);
  const [audioStarted, setAudioStarted] = useState(false);
  const [volume, setVolume] = useState(1);

  const finishFormRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);
  const offsetRef = useRef(live ? Date.parse(live.serverNow) - Date.now() : 0);
  const deadlineMs = live ? Date.parse(live.deadlineAt) : 0;
  const [remaining, setRemaining] = useState<number | null>(
    live ? Math.max(0, Math.round((deadlineMs - (Date.now() + offsetRef.current)) / 1000)) : null
  );

  useEffect(() => {
    if (!live) return;
    const tick = () => {
      const rem = Math.max(0, Math.round((deadlineMs - (Date.now() + offsetRef.current)) / 1000));
      setRemaining(rem);
      if (rem <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        finishFormRef.current?.requestSubmit();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [live, deadlineMs]);

  const onFinish = live
    ? () => {
        if (submittedRef.current) return;
        submittedRef.current = true;
        finishFormRef.current?.requestSubmit();
      }
    : undefined;

  function step(dir: -1 | 1) {
    const i = orderedNums.indexOf(activeNum);
    const next = orderedNums[Math.min(orderedNums.length - 1, Math.max(0, i + dir))];
    if (next !== undefined) setActiveNum(next);
  }

  const immersive = Boolean(live);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    if (!immersive) return;
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    void document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
    };
  }, [immersive]);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <div
      className={
        immersive
          ? "fixed inset-0 z-50 flex flex-col overflow-hidden bg-surface"
          : "overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
      }
    >
      <TopBar
        exam={exam}
        audioUrl={audioUrl}
        audioStarted={audioStarted}
        onStartAudio={() => {
          setAudioStarted(true);
          void audioRef.current?.play();
        }}
        volume={volume}
        onVolume={(v) => {
          setVolume(v);
          if (audioRef.current) audioRef.current.volume = v;
        }}
        remaining={remaining}
        onFinish={onFinish}
        partProgress={live?.mock ? { index: live.mock.index, count: live.mock.count } : undefined}
        finishLabel={
          live?.mock
            ? live.mock.index + 1 < live.mock.count
              ? "Finish part"
              : "Finish exam"
            : undefined
        }
        isFullscreen={immersive ? isFullscreen : undefined}
        onToggleFullscreen={immersive ? toggleFullscreen : undefined}
      />

      {live ? (
        <>
          <Autosaver attemptId={live.attemptId} />
          {live.mock ? (
            <form ref={finishFormRef} action={submitMockPartAction} className="hidden">
              <input type="hidden" name="mockAttemptId" value={live.mock.mockAttemptId} />
              <input type="hidden" name="attemptId" value={live.attemptId} />
            </form>
          ) : (
            <form ref={finishFormRef} action={submitBlueprintAttemptAction} className="hidden">
              <input type="hidden" name="attemptId" value={live.attemptId} />
            </form>
          )}
        </>
      ) : null}

      {exam.module === "listening" && audioUrl ? (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={() => {
            const t = audioRef.current?.currentTime ?? 0;
            maxRef.current = Math.max(maxRef.current, t);
          }}
          onSeeking={() => {
            if (audioRef.current && audioRef.current.currentTime > maxRef.current + 0.5) {
              audioRef.current.currentTime = maxRef.current;
            }
          }}
        />
      ) : null}

      {exam.module === "reading" ? (
        <PartBanner index={activePart} from={partFrom} to={partTo} />
      ) : null}

      <div className={immersive ? "min-h-0 flex-1 overflow-hidden" : ""}>
        {section ? (
          exam.module === "reading" && section.passageBlocks.length > 0 ? (
            <ReadingBody section={section} index={activePart} fill={immersive} />
          ) : (
            <ListeningBody section={section} index={activePart} fill={immersive} />
          )
        ) : (
          <div className="p-6 text-sm text-muted">No questions in this exam.</div>
        )}
      </div>

      <BottomNav
        exam={exam}
        entries={entries}
        answers={answers}
        activeNum={activeNum}
        onPick={setActiveNum}
        onStep={step}
      />
    </div>
  );
}

export function ExamPreview({
  exam,
  audioUrl,
  live
}: {
  exam: PreviewExam;
  audioUrl: string | null;
  live?: LiveAttempt;
}) {
  return (
    <AnswersProvider initial={live?.initialAnswers}>
      <Shell exam={exam} audioUrl={audioUrl} live={live} />
    </AnswersProvider>
  );
}
