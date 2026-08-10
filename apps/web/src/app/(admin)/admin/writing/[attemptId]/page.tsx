import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveWritingMarkAction } from "@/lib/mock-actions";
import { bandLabel } from "@/lib/mock-band";
import type { PreviewExam } from "@/lib/exam-import-map";
import type { CandidateAnswer, WritingCriteria } from "@ielts/core";

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
  feedback?: string | null;
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

export default async function StandaloneWritingReviewPage({
  params
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) redirect("/login");

  const attempt = await prisma.blueprintAttempt.findFirst({
    where: {
      id: attemptId,
      mockAttemptId: null,
      blueprint: { module: "writing", orgId: me.orgId }
    },
    include: {
      candidate: { select: { name: true, email: true } },
      blueprint: true
    }
  });
  if (!attempt) notFound();

  const engine = attempt.blueprint.engineJson as unknown as PreviewExam;
  const answers = attempt.answersJson as unknown as Record<string, CandidateAnswer>;
  const rj = attempt.resultJson as unknown as Partial<WritingResult> | null;
  const mark = rj && Array.isArray(rj.tasks) ? (rj as WritingResult) : null;
  const tasks = essayTasks(engine);

  return (
    <PageShell
      title={attempt.candidate.name ?? attempt.candidate.email}
      subtitle={`${attempt.blueprint.title} · ${
        attempt.submittedAt ? attempt.submittedAt.toLocaleString() : "in progress"
      }`}
      actions={
        <Badge variant={mark ? "success" : "warning"}>
          {mark ? `Writing band ${bandLabel(mark.writingBand)}` : "Pending"}
        </Badge>
      }
    >
      <Link
        href="/admin/writing"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to writing evaluation
      </Link>

      <Card className="p-5">
        <form action={saveWritingMarkAction} className="space-y-5">
          <input type="hidden" name="attemptId" value={attempt.id} />
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
                        defaultValue={existing ? String(existing.criteria[c.field]) : ""}
                        className={critField}
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          <div>
            <label htmlFor="feedback" className="text-xs font-medium text-muted">
              Feedback (optional) — shown to the candidate with their result
            </label>
            <textarea
              id="feedback"
              name="feedback"
              rows={4}
              maxLength={5000}
              defaultValue={mark?.feedback ?? ""}
              placeholder="Overall comments on the writing — strengths and concrete steps to the next band…"
              className="mt-1 w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            />
          </div>
          <Button type="submit" variant="secondary">
            <Save className="h-4 w-4" /> Save writing marks
          </Button>
        </form>
      </Card>
    </PageShell>
  );
}
