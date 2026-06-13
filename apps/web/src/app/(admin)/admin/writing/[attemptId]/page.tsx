import { notFound } from "next/navigation";
import type { WritingCriteria } from "@ielts/core";
import { getAttemptWriting } from "@/lib/writing-eval";
import { publishResultAction, saveEvaluationAction } from "@/lib/writing-actions";
import { PageShell } from "@/components/Shell";

const CRITERIA: { name: keyof WritingCriteria; label: string }[] = [
  { name: "taskResponse", label: "Task Response" },
  { name: "coherenceCohesion", label: "Coherence & Cohesion" },
  { name: "lexicalResource", label: "Lexical Resource" },
  { name: "grammaticalRange", label: "Grammatical Range & Accuracy" }
];

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
      subtitle={`${attempt.exam.title}. Listening ${attempt.score?.listeningBand ?? "—"} · Reading ${attempt.score?.readingBand ?? "—"}`}
    >
      {attempt.writingSubmissions.map((submission) => {
        const criteria = (submission.evaluation?.criteriaJson as WritingCriteria | null) ?? null;
        return (
          <div key={submission.id} className="rounded-xl border border-brand-100 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-brand-700">Task {submission.taskNo}</h2>
              <span className="text-sm text-foreground/60">
                {submission.wordCount} words
                {submission.evaluation?.taskBand != null
                  ? ` · band ${submission.evaluation.taskBand.toFixed(1)}`
                  : ""}
              </span>
            </div>

            <div className="mb-4 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-brand-50/40 p-3 text-sm text-foreground/80">
              {submission.contentText || <span className="text-foreground/40">No response.</span>}
            </div>

            <form action={saveEvaluationAction} className="space-y-3">
              <input type="hidden" name="attemptId" value={attemptId} />
              <input type="hidden" name="taskNo" value={submission.taskNo} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CRITERIA.map((c) => (
                  <label key={c.name} className="text-xs text-foreground/60">
                    {c.label}
                    <input
                      type="number"
                      name={c.name}
                      min={0}
                      max={9}
                      step={0.5}
                      required
                      defaultValue={criterion(criteria, c.name)}
                      className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1 text-sm text-foreground"
                    />
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Save Task {submission.taskNo} band
              </button>
            </form>
          </div>
        );
      })}

      <form action={publishResultAction} className="flex items-center gap-3">
        <input type="hidden" name="attemptId" value={attemptId} />
        <button
          type="submit"
          disabled={!allScored}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Publish result
        </button>
        {!allScored ? (
          <span className="text-sm text-foreground/50">Score every task to publish.</span>
        ) : (
          <span className="text-sm text-foreground/60">
            Computes Writing &amp; Overall band, then publishes to the candidate.
          </span>
        )}
      </form>
    </PageShell>
  );
}
