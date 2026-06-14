import { notFound } from "next/navigation";
import { Send } from "lucide-react";
import type { WritingCriteria } from "@ielts/core";
import { getAttemptWriting } from "@/lib/writing-eval";
import { publishResultAction, saveEvaluationAction } from "@/lib/writing-actions";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CRITERIA: { name: keyof WritingCriteria; label: string }[] = [
  { name: "taskResponse", label: "Task Response" },
  { name: "coherenceCohesion", label: "Coherence & Cohesion" },
  { name: "lexicalResource", label: "Lexical Resource" },
  { name: "grammaticalRange", label: "Grammatical Range & Accuracy" }
];

const field =
  "mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

function criterion(criteria: WritingCriteria | null, key: keyof WritingCriteria): string {
  const value = criteria?.[key];
  return typeof value === "number" ? String(value) : "";
}

export default async function AdminWritingEvalPage({
  params
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const attempt = await getAttemptWriting(attemptId);
  if (!attempt) notFound();

  const allScored =
    attempt.writingSubmissions.length > 0 &&
    attempt.writingSubmissions.every((s) => s.evaluation?.taskBand != null);

  return (
    <PageShell
      title={`Writing — ${attempt.candidate.name ?? attempt.candidate.email}`}
      subtitle={`${attempt.exam.title} · Listening ${attempt.score?.listeningBand ?? "—"} · Reading ${attempt.score?.readingBand ?? "—"}`}
    >
      {attempt.writingSubmissions.map((submission) => {
        const criteria = (submission.evaluation?.criteriaJson as WritingCriteria | null) ?? null;
        return (
          <Card key={submission.id} className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Task {submission.taskNo}</h2>
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>{submission.wordCount} words</span>
                {submission.evaluation?.taskBand != null ? (
                  <Badge variant="success">band {submission.evaluation.taskBand.toFixed(1)}</Badge>
                ) : (
                  <Badge variant="warning">not scored</Badge>
                )}
              </div>
            </div>

            <div className="mb-4 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-brand-50/40 p-3 text-sm text-foreground/80">
              {submission.contentText || <span className="text-muted">No response.</span>}
            </div>

            <form action={saveEvaluationAction} className="space-y-3">
              <input type="hidden" name="attemptId" value={attemptId} />
              <input type="hidden" name="taskNo" value={submission.taskNo} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CRITERIA.map((c) => (
                  <label key={c.name} className="text-xs text-muted">
                    {c.label}
                    <input
                      type="number"
                      name={c.name}
                      min={0}
                      max={9}
                      step={0.5}
                      required
                      defaultValue={criterion(criteria, c.name)}
                      className={field}
                    />
                  </label>
                ))}
              </div>
              <Button type="submit" variant="outline" size="sm">
                Save Task {submission.taskNo} band
              </Button>
            </form>
          </Card>
        );
      })}

      <Card className="flex flex-wrap items-center gap-3 p-5">
        <form action={publishResultAction}>
          <input type="hidden" name="attemptId" value={attemptId} />
          <Button type="submit" variant="success" disabled={!allScored}>
            <Send className="h-4 w-4" /> Publish result
          </Button>
        </form>
        <span className="text-sm text-muted">
          {allScored
            ? "Computes Writing & Overall band, then publishes to the candidate."
            : "Score every task to enable publishing."}
        </span>
      </Card>
    </PageShell>
  );
}
