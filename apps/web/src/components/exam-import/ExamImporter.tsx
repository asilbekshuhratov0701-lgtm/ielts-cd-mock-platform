"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Music,
  Play,
  Upload,
  XCircle
} from "lucide-react";
import { validateExamFile, type ValidationReport } from "@ielts/validators";
import { mapExamFile, type PreviewExam, type PreviewSection } from "@/lib/exam-import-map";
import { AnswersProvider } from "@/components/question-engine/answers-store";
import { QuestionGroupRenderer } from "@/components/question-engine/QuestionGroupRenderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

function formatTime(total: number): string {
  const s = Math.max(0, Math.floor(total));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function ReportView({ report }: { report: ValidationReport }) {
  return (
    <Card className={cn("p-4", report.ok ? "border-emerald-200" : "border-red-200")}>
      <div className="mb-2 flex items-center gap-2">
        {report.ok ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
        <span className="font-semibold text-foreground">
          {report.ok ? "Valid" : "Invalid"} · {report.module ?? "?"} ·{" "}
          {report.questionCount}/{report.totalQuestions ?? "?"} questions
        </span>
      </div>
      {report.audioRequiredRef ? (
        <p className="mb-2 flex items-center gap-1.5 text-sm text-amber-700">
          <Music className="h-4 w-4" /> Audio required: <code>{report.audioRequiredRef}</code> —
          upload it below to play the Listening exam.
        </p>
      ) : null}
      {report.errors.length > 0 ? (
        <ul className="mb-2 space-y-1">
          {report.errors.map((e, i) => (
            <li key={i} className="flex items-start gap-1.5 text-sm text-red-700">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-medium">{e.where}</span>: {e.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {report.warnings.length > 0 ? (
        <ul className="space-y-1">
          {report.warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-1.5 text-sm text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-medium">{w.where}</span>: {w.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {report.ok && report.warnings.length === 0 ? (
        <p className="text-sm text-emerald-700">No issues — ready to preview.</p>
      ) : null}
    </Card>
  );
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
        <Music className="h-4 w-4" /> Upload the Listening audio file above to play it against the
        questions.
      </Card>
    );
  }

  return (
    <Card className="sticky top-2 z-10 flex items-center gap-3 p-3">
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
          {playing ? "Playing" : "Paused"} · <span className="tabular-nums">{formatTime(elapsed)}</span>
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

function PreviewExamView({ exam, audioUrl }: { exam: PreviewExam; audioUrl: string | null }) {
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

export function ExamImporter() {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [exam, setExam] = useState<PreviewExam | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);

  async function onJsonFile(file: File) {
    setParseError(null);
    setReport(null);
    setExam(null);
    setFileName(file.name);
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch (e) {
      setParseError(`Could not parse JSON: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    const r = validateExamFile(json);
    setReport(r);
    if (r.ok && r.parsed) setExam(mapExamFile(r.parsed));
  }

  function onAudioFile(file: File) {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    setAudioName(file.name);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="mb-1 font-semibold text-foreground">1 · Upload exam JSON</h2>
        <p className="mb-3 text-sm text-muted">
          One file per skill (Reading / Listening / Writing). It is validated against the schema and
          every cross-check before preview.
        </p>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-foreground/[0.02] px-4 py-6 transition-colors hover:border-brand-300 hover:bg-brand-50/40">
          <Upload className="h-5 w-5 text-brand-600" />
          <span className="text-sm text-foreground">
            {fileName ? (
              <span className="inline-flex items-center gap-1.5">
                <FileJson className="h-4 w-4 text-brand-600" /> {fileName} — choose another
              </span>
            ) : (
              "Choose a .json exam file"
            )}
          </span>
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onJsonFile(f);
            }}
          />
        </label>
        {parseError ? <p className="mt-2 text-sm text-red-700">{parseError}</p> : null}
      </Card>

      {report ? <ReportView report={report} /> : null}

      {exam && exam.module === "listening" ? (
        <Card className="p-5">
          <h2 className="mb-1 font-semibold text-foreground">2 · Upload Listening audio</h2>
          <p className="mb-3 text-sm text-muted">
            One continuous file for the whole module, bound to{" "}
            <code>{exam.audioRef ?? "the audio slot"}</code>. Used here for preview; final upload is
            stored in the media library at publish time.
          </p>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-foreground/[0.02] px-4 py-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40">
            <Music className="h-5 w-5 text-brand-600" />
            <span className="text-sm text-foreground">
              {audioName ? `${audioName} — choose another` : "Choose an audio file (mp3, m4a, …)"}
            </span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onAudioFile(f);
              }}
            />
          </label>
        </Card>
      ) : null}

      {exam ? (
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-foreground">
            {exam.module === "listening" ? "3" : "2"} · CD preview
          </h2>
          <PreviewExamView exam={exam} audioUrl={audioUrl} />
        </Card>
      ) : null}
    </div>
  );
}
