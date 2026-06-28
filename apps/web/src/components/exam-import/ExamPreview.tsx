"use client";

import { useRef, useState } from "react";
import { Music, Play } from "lucide-react";
import type { PreviewExam, PreviewSection } from "@/lib/exam-import-map";
import { AnswersProvider } from "@/components/question-engine/answers-store";
import { QuestionGroupRenderer } from "@/components/question-engine/QuestionGroupRenderer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function formatTime(total: number): string {
  const s = Math.max(0, Math.floor(total));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function AudioBar({ url }: { url: string | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  const maxRef = useRef(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  if (!url) {
    return (
      <Card className="flex items-center gap-2 border-amber-200 p-3 text-sm text-amber-700">
        <Music className="h-4 w-4" /> No audio attached yet — the Listening exam needs its audio file
        before it can play.
      </Card>
    );
  }

  return (
    <Card className="sticky top-2 z-10 flex flex-wrap items-center gap-3 p-3">
      <audio
        ref={ref}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => {
          const t = ref.current?.currentTime ?? 0;
          maxRef.current = Math.max(maxRef.current, t);
          setElapsed(t);
        }}
        onSeeking={() => {
          if (ref.current && ref.current.currentTime > maxRef.current + 0.5) {
            ref.current.currentTime = maxRef.current;
          }
        }}
      />
      {!started ? (
        <Button
          size="sm"
          onClick={() => {
            setStarted(true);
            void ref.current?.play();
          }}
        >
          <Play className="h-4 w-4" /> Start audio (plays once)
        </Button>
      ) : (
        <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Music className={cn("h-4 w-4", playing ? "text-brand-600" : "text-muted")} />
          {playing ? "Playing" : "Paused"} ·{" "}
          <span className="tabular-nums">{formatTime(elapsed)}</span>
        </span>
      )}
      <span className="text-xs text-muted">No seeking · single play (faithful CD behaviour)</span>
    </Card>
  );
}

function PassagePane({ section }: { section: PreviewSection }) {
  return (
    <div className="space-y-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-auto lg:pr-2">
      <Card className="p-5">
        {section.title ? <h3 className="font-semibold text-brand-700">{section.title}</h3> : null}
        {section.subtitle ? (
          <p className="mb-2 text-sm font-medium text-foreground">{section.subtitle}</p>
        ) : null}
        <div className="space-y-2 text-sm leading-relaxed text-foreground/80">
          {section.passageBlocks.map((b, i) => (
            <p key={i}>
              {b.label ? <span className="mr-2 font-semibold text-brand-700">{b.label}</span> : null}
              {b.text}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function ExamPreview({ exam, audioUrl }: { exam: PreviewExam; audioUrl: string | null }) {
  const isReading = exam.module === "reading";
  return (
    <AnswersProvider>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-foreground/[0.02] px-4 py-2 text-sm">
        <span className="font-semibold uppercase tracking-wide text-brand-700">{exam.module}</span>
        <span className="text-muted">·</span>
        <span className="text-foreground">{exam.title}</span>
        <span className="text-muted">·</span>
        <span className="text-muted">
          {exam.timerSource === "audio"
            ? "timer follows audio"
            : `${exam.timeLimitMinutes ?? "?"} min`}
        </span>
      </div>

      {exam.module === "listening" ? (
        <div className="mb-4">
          <AudioBar url={audioUrl} />
        </div>
      ) : null}

      <div className="space-y-8">
        {exam.sections.map((section) => (
          <section key={section.id}>
            <div className="mb-3 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white">
              {section.title || section.id}
              {section.instructions ? (
                <span className="ml-2 font-normal opacity-90">{section.instructions}</span>
              ) : null}
            </div>
            {isReading && section.passageBlocks.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <PassagePane section={section} />
                <div className="flex flex-col gap-[var(--space-group)]">
                  {section.groups.map((g) => (
                    <QuestionGroupRenderer key={g.id} group={g} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-[var(--space-group)]">
                {section.scenario ? (
                  <p className="text-sm italic text-muted">{section.scenario}</p>
                ) : null}
                {section.groups.map((g) => (
                  <QuestionGroupRenderer key={g.id} group={g} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </AnswersProvider>
  );
}
