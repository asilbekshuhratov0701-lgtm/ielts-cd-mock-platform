import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Save, XCircle } from "lucide-react";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildAnswerRows } from "@/lib/mock-review";
import { skillBand, overallBandFrom, bandLabel } from "@/lib/mock-band";
import { saveMockWritingMarkAction } from "@/lib/mock-actions";
import type { PreviewExam } from "@/lib/exam-import-map";
import type { CandidateAnswer, ImportAnswerKey, WritingCriteria } from "@ielts/core";
import { cn } from "@/lib/cn";

const CRIT: { key: string; label: string; field: keyof WritingCriteria }[] = [
  { key: "tr", label: "Task Response", field: "taskResponse" },
  { key: "cc", label: "Coherence & Cohesion", field: "coherenceCohesion" },
  { key: "lr", label: "Lexical Resource", field: "lexicalResource" },
  { key: "gr", label: "Grammatical Range", field: "grammaticalRange" }
];

const critField =
  "mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

interface WritingResult {
  kind: "writing";
  tasks: { taskNumber: number; criteria: WritingCriteria; taskBand: number }[];
  writingBand: number;
}

type EssayTask = { id: string; number: number; prompt: string };

function essayTasks(engine: PreviewExam): EssayTask[] {
  const groups = (engine.sections ?? []).flatMap((s) => s.groups) as unknown as {
    inputKind: string;
    tasks?: EssayTask[];
  }[];
  return groups
    .filter((g) => g.inputKind === "essay")
    .flatMap((g) => g.tasks ?? [])
    .sort((a, b) => a.number - b.number);
}

function words(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function partBand(part: {
  blueprint: { module: string };
  rawScore: number | null;
  totalScore: number | null;
  resultJson: unknown;
}): number | null {
  if (part.blueprint.module === "writing") {
    const w = part.resultJson as WritingResult | null;
    return typeof w?.writingBand === "number" ? w.writingBand : null;
  }
  return skillBand(part.blueprint.module, part.rawScore ?? 0, part.totalScore ?? 0);
}

export default async function MockAttemptReviewPage({
  params
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) redirect("/login");

  const attempt = await prisma.mockAttempt.findUnique({
    where: { id: attemptId },
    include: {
      candidate: { select: { name: true, email: true } },
      mockExam: { select: { id: true, title: true, orgId: true } },
      partAttempts: { include: { blueprint: true }, orderBy: { partOrder: "asc" } }
    }
  });
  if (!attempt || attempt.mockExam.id !== id || attempt.mockExam.orgId !== me.orgId) notFound();

  const overall = overallBandFrom(attempt.partAttempts.map((p) => partBand(p)));

  return (
    <PageShell
      title={attempt.candidate.name ?? attempt.candidate.email}
      subtitle={`${attempt.mockExam.title} · ${
        attempt.submittedAt ? attempt.submittedAt.toLocaleString() : "in progress"
      }`}
      actions={
        <Badge variant={attempt.status === "submitted" ? "success" : "warning"}>
          {attempt.status === "submitted" ? `Overall band ${bandLabel(overall)}` : attempt.status}
        </Badge>
      }
    >
      <Link
        href={`/admin/exam-import/mock/${id}`}
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to mock
      </Link>

      {attempt.partAttempts.map((part) => {
        const engine = part.blueprint.engineJson as unknown as PreviewExam;
        const answers = part.answersJson as unknown as Record<string, CandidateAnswer>;
        const band = partBand(part);

        if (part.blueprint.module === "writing") {
          const tasks = essayTasks(engine);
          const rj = part.resultJson as unknown as Partial<WritingResult> | null;
          const mark = rj && Array.isArray(rj.tasks) ? (rj as WritingResult) : null;
          return (
            <Card key={part.id} className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-foreground">
                  <span className="capitalize">writing</span>
                  <span className="ml-2 text-sm font-normal text-muted">{part.blueprint.title}</span>
                </h2>
                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-sm font-semibold text-brand-700">
                  Writing band {bandLabel(band)}
                </span>
              </div>

              <form action={saveMockWritingMarkAction} className="space-y-5">
                <input type="hidden" name="attemptId" value={part.id} />
                {tasks.map((t) => {
                  const essay = typeof answers?.[t.id] === "string" ? (answers[t.id] as string) : "";
                  const existing = mark?.tasks.find((x) => x.taskNumber === t.number);
                  return (
                    <div key={t.id} className="rounded-lg border border-border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">Task {t.number}</h3>
                        <span className="text-sm text-muted">
                          {words(essay)} words
                          {existing ? ` · band ${existing.taskBand.toFixed(1)}` : ""}
                        </span>
                      </div>
                      <p className="mb-2 text-xs italic text-muted">{t.prompt}</p>
                      <div className="mb-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-brand-50/40 p-3 text-sm text-foreground/80">
                        {essay || <span className="text-muted">No response.</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {CRIT.map((c) => (
                          <label key={c.key} className="text-xs text-muted">
                            {c.label}
                            <input
                              type="number"
                              name={`t${t.number}_${c.key}`}
                              min={0}
                              max={9}
                              step={0.5}
                              defaultValue={
                                existing ? String(existing.criteria[c.field]) : ""
                              }
                              className={critField}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <Button type="submit" variant="secondary">
                  <Save className="h-4 w-4" /> Save writing marks
                </Button>
              </form>
            </Card>
          );
        }

        const answerKey = part.blueprint.answerKeyJson as unknown as Record<string, ImportAnswerKey>;
        const rows = buildAnswerRows(engine, answerKey, answers);
        return (
          <Card key={part.id} className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-foreground">
                <span className="capitalize">{part.blueprint.module}</span>
                <span className="ml-2 text-sm font-normal text-muted">{part.blueprint.title}</span>
              </h2>
              <span className="flex items-center gap-3 text-sm">
                <span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
                  Band {bandLabel(band)}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {part.rawScore ?? 0} / {part.totalScore ?? 0}
                </span>
              </span>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-muted">No auto-scored answers for this part.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="w-16 px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Candidate answer</th>
                      <th className="px-3 py-2 font-medium">Accepted answer</th>
                      <th className="w-16 px-3 py-2 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => (
                      <tr key={r.number} className="align-top">
                        <td className="px-3 py-2 font-medium tabular-nums text-foreground">
                          {r.number}
                        </td>
                        <td className={cn("px-3 py-2", r.correct ? "text-foreground" : "text-red-700")}>
                          {r.candidate}
                        </td>
                        <td className="px-3 py-2 text-muted">{r.accepted}</td>
                        <td className="px-3 py-2">
                          {r.correct ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
    </PageShell>
  );
}
