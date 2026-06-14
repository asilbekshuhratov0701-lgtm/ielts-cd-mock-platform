import Link from "next/link";
import { listPendingEvaluations } from "@/lib/writing-eval";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Writing Evaluation" };

export default async function AdminWritingPage() {
  const attempts = await listPendingEvaluations();

  return (
    <PageShell
      title="Writing Evaluation"
      subtitle="Score submitted Writing tasks. Publishing computes the Writing & Overall band."
    >
      {attempts.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          No writing submissions awaiting evaluation.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-brand-50/40 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Tasks scored</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attempts.map((attempt) => {
                const total = attempt.writingSubmissions.length;
                const scored = attempt.writingSubmissions.filter(
                  (s) => s.evaluation?.taskBand != null
                ).length;
                const published =
                  attempt.status === "PUBLISHED" || attempt.score?.writingBand != null;
                return (
                  <tr key={attempt.id} className="hover:bg-brand-50/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {attempt.candidate.name ?? attempt.candidate.email}
                    </td>
                    <td className="px-4 py-3 text-muted">{attempt.exam.title}</td>
                    <td className="px-4 py-3 text-muted">
                      {attempt.submittedAt ? attempt.submittedAt.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {scored} / {total}
                    </td>
                    <td className="px-4 py-3">
                      {published ? (
                        <Badge variant="success">Published</Badge>
                      ) : scored === 0 ? (
                        <Badge variant="warning">Pending</Badge>
                      ) : (
                        <Badge variant="default">In review</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/writing/${attempt.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        Evaluate
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}
