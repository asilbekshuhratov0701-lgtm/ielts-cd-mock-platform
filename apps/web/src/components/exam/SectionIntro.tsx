"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Film,
  Headphones,
  Play,
  Square,
  Volume1,
  Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { beginSectionAction } from "@/lib/blueprint-play-actions";
import {
  instructionVideoFor,
  type InstructionVideo,
  type SectionIntroCopy
} from "@/lib/section-intro";

export interface IntroStep {
  label: string;
  state: "done" | "current" | "upcoming";
}

type Stage = "sound" | "instructions" | "video";

const SOUND_CHECK_SRC = "/audio/sound-check.wav";

function bold(text: string): ReactNode[] {
  return text.split("**").map((chunk, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-bold text-foreground">
        {chunk}
      </strong>
    ) : (
      <span key={i}>{chunk}</span>
    )
  );
}

function Stepper({ steps }: { steps: IntroStep[] }) {
  return (
    <ol className="mt-10 flex items-start">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const filled = step.state !== "upcoming";
        return (
          <li key={step.label} className={cn("flex min-w-0 flex-1", last && "flex-none")}>
            <div className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : filled ? "bg-brand-600" : "bg-border")} />
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    step.state === "done"
                      ? "bg-brand-600 text-white"
                      : step.state === "current"
                        ? "bg-brand-600 text-white ring-4 ring-brand-100"
                        : "bg-foreground/5 text-muted"
                  )}
                >
                  {step.state === "done" ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    last ? "bg-transparent" : steps[i + 1]?.state !== "upcoming" ? "bg-brand-600" : "bg-border"
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-2 truncate text-sm",
                  step.state === "upcoming" ? "text-muted" : "font-semibold text-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SoundCheck({ onContinue }: { onContinue: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
      return;
    }
    el.volume = volume;
    void el
      .play()
      .then(() => {
        setFailed(false);
        setPlaying(true);
      })
      .catch(() => setFailed(true));
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
      <h1 className="text-xl font-bold text-foreground">Test sound</h1>
      <p className="mt-3 text-base text-foreground/80">
        Put on your headphones and click the <span className="font-semibold">Play sound</span>{" "}
        button to play a sample sound.
      </p>

      <audio
        ref={audioRef}
        src={SOUND_CHECK_SRC}
        preload="auto"
        onEnded={() => setPlaying(false)}
      />

      <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
        <Button type="button" onClick={toggle} className="min-w-[10rem]">
          {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Stop sound" : "Play sound"}
        </Button>

        <div className="flex items-center gap-3">
          <Volume1 className="h-4 w-4 shrink-0 text-muted" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="h-1.5 w-40 cursor-pointer appearance-none rounded-full bg-border accent-brand-600"
            style={{
              background: `linear-gradient(to right, rgb(79 70 229) 0%, rgb(79 70 229) ${volume * 100}%, rgb(226 232 240) ${volume * 100}%, rgb(226 232 240) 100%)`
            }}
          />
          <Volume2 className="h-4 w-4 shrink-0 text-muted" />
        </div>
      </div>

      {failed ? (
        <p className="mt-4 text-center text-sm text-amber-600">
          Your browser blocked playback. Click Play sound again.
        </p>
      ) : null}

      <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted">
        <Headphones className="h-3.5 w-3.5" />
        Set the volume so you can hear the voice clearly. You can change it during the test.
      </p>

      <div className="mt-6 flex justify-center">
        <Button type="button" variant="secondary" onClick={onContinue} className="min-w-[10rem]">
          Continue
        </Button>
      </div>
    </div>
  );
}

function StartButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="min-w-[11rem]">
      {pending ? "Starting…" : "Start test"}
    </Button>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" variant="success" disabled={pending} className="min-w-[11rem]">
      <CheckCircle2 className="h-4 w-4" />
      {pending ? "Starting…" : "Confirm"}
    </Button>
  );
}

function Instructions({
  attemptId,
  copy,
  steps,
  hasVideo,
  onContinue
}: {
  attemptId: string;
  copy: SectionIntroCopy;
  steps: IntroStep[];
  hasVideo: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
      <h1 className="text-xl font-bold text-foreground">{copy.title}</h1>
      <p className="mt-2 text-base text-foreground/80">Time: {copy.time}</p>

      <h2 className="mt-7 text-base font-bold uppercase tracking-wide text-foreground">
        Instructions to candidates
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-base text-foreground/85">
        {copy.instructions.map((line) => (
          <li key={line}>{bold(line)}</li>
        ))}
      </ul>

      <h2 className="mt-7 text-base font-bold uppercase tracking-wide text-foreground">
        Information for candidates
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-base text-foreground/85">
        {copy.information.map((line) => (
          <li key={line}>{bold(line)}</li>
        ))}
      </ul>

      <p className="mt-7 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
        {hasVideo ? (
          <>
            A short instruction video comes next. Your time starts when you press{" "}
            <span className="font-semibold">Confirm</span> after it — nothing is counting down while
            you read this.
          </>
        ) : (
          <>
            Your time starts when you press <span className="font-semibold">Start test</span> —
            nothing is counting down while you read this.
          </>
        )}
      </p>

      {hasVideo ? (
        <div className="mt-6 flex justify-center">
          <Button type="button" size="lg" onClick={onContinue} className="min-w-[11rem]">
            Continue
          </Button>
        </div>
      ) : (
        <form action={beginSectionAction} className="mt-6 flex justify-center">
          <input type="hidden" name="attemptId" value={attemptId} />
          <StartButton />
        </form>
      )}

      {steps.length > 1 ? <Stepper steps={steps} /> : null}
    </div>
  );
}

function VideoBriefing({
  attemptId,
  video,
  examTitle,
  onBack
}: {
  attemptId: string;
  video: InstructionVideo;
  examTitle: string;
  onBack: () => void;
}) {
  const [watched, setWatched] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 items-center justify-between gap-4 px-6 py-4">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-muted">
          {examTitle}
        </p>
        <h1 className="min-w-0 truncate text-sm font-bold text-foreground">{video.title}</h1>
        <p className="flex min-w-0 flex-1 items-center justify-end gap-2 truncate text-xs text-muted">
          {watched ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              Video watched
            </>
          ) : (
            <>
              <Film className="h-4 w-4 shrink-0" />
              Instruction video
            </>
          )}
        </p>
      </div>

      <div className="min-h-0 flex-1 bg-black">
        <video
          src={video.src}
          controls
          controlsList="nodownload"
          playsInline
          preload="metadata"
          onEnded={() => setWatched(true)}
          className="h-full w-full object-contain"
        />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 px-6 py-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" /> Instructions
        </Button>

        <p className="hidden text-center text-sm text-muted sm:block">
          Your time starts when you press{" "}
          <span className="font-semibold text-foreground">Confirm</span> — nothing is counting down
          while you watch this.
        </p>

        <form action={beginSectionAction}>
          <input type="hidden" name="attemptId" value={attemptId} />
          <ConfirmButton />
        </form>
      </div>
    </div>
  );
}

export function SectionIntro({
  attemptId,
  module,
  copy,
  steps,
  examTitle
}: {
  attemptId: string;
  module: string;
  copy: SectionIntroCopy;
  steps: IntroStep[];
  examTitle: string;
}) {
  const video = instructionVideoFor(module);
  const [stage, setStage] = useState<Stage>(module === "listening" ? "sound" : "instructions");

  if (stage === "video" && video) {
    return (
      <VideoBriefing
        attemptId={attemptId}
        video={video}
        examTitle={examTitle}
        onBack={() => setStage("instructions")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-6 text-xs font-semibold uppercase tracking-wide text-muted">{examTitle}</p>

        {stage === "sound" ? (
          <SoundCheck onContinue={() => setStage("instructions")} />
        ) : (
          <Instructions
            attemptId={attemptId}
            copy={copy}
            steps={steps}
            hasVideo={video !== null}
            onContinue={() => setStage("video")}
          />
        )}
      </div>
    </div>
  );
}
