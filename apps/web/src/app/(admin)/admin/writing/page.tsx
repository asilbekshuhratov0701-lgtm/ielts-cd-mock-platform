import Link from "next/link";
import { listPendingEvaluations } from "@/lib/writing-eval";
import { PageShell } from "@/components/Shell";

export const metadata = { title: "Writing Evaluation" };

export default async function AdminWritingPage() {
  const attempts = await listPendingEvaluations();

  return (
    <PageShell
      title="Writing Evaluation"
      subtitle="Score submitted Writing tasks. Publishing computes the Writing & Overall band."
    >
      {attempts.length === 0 ? (
        <p className="text-sm text-foreground/60">No writing submissions awaiting evaluation.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-brand-100">
          <table className="w-full text-sm">
            <thead className="bg-brand-50/50 text-left text-foreground/60">
              <tr>
                <th className="px-4 py-2 font-medium">Candidate</th>
                <th className="px-4 py-2 font-medium">Exam</th>
                <th className="px-4 py-2 font-medium">Submitted</th>
                <th className="px-4 py-2 font-medium">Tasks scored</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => {
                const total = attempt.writingSubmissions.length;
                const scored = attempt.writingSubmissions.filter(
                  (s) => s.evaluation?.taskBand != null
                ).length;
                const published =
                  attempt.status === "PUBLISHED" || attempt.score?.writingBand != null;
                return (
                  <tr key={attempt.id} className="border-t border-brand-100">
                    <td className="px-4 py-2 font-medium text-brand-700">
                      {attempt.candidate.name ?? attempt.candidate.email}
                    </td>
                    <td className="px-4 py-2">{attempt.exam.title}</td>
                    <td className="px-4 py-2 text-foreground/60">
                      {attempt.submittedAt ? attempt.submittedAt.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {scored} / {total}
                    </td>
                    <td className="px-4 py-2">
                      {published ? (
                        <span className="text-green-700">Published</span>
                      ) : scored === 0 ? (
                        <span className="text-amber-600">Pending</span>
                      ) : (
                        <span className="text-brand-600">In review</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/admin/writing/${attempt.id}`}
                        className="text-brand-600 hover:underline"
                      >
                        Evaluate
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
