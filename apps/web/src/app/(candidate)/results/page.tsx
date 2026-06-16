import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Results" };

function band(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(1);
}

export default async function ResultsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const attempts = await prisma.attempt.findMany({
    where: {
      candidateId: session.user.id,
      status: { in: ["SUBMITTED", "GRADED", "PUBLISHED"] }
    },
    include: { exam: true, score: true },
    orderBy: { submittedAt: "desc" }
  });

  return (
    <PageShell
      title="Results"
      subtitle="Listening & Reading are scored automatically; Writing is examiner-marked."
    >
      {attempts.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No completed exams yet.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-brand-50/40 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Listening</th>
                <th className="px-4 py-3 font-medium">Reading</th>
                <th className="px-4 py-3 font-medium">Writing</th>
                <th className="px-4 py-3 font-medium">Overall</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attempts.map((attempt) => {
                const released = attempt.score?.publishedAt != null;
                return (
                  <tr key={attempt.id} className="hover:bg-brand-50/30">
                    <td className="px-4 py-3 font-medium text-foreground">{attempt.exam.title}</td>
                    <td className="px-4 py-3 text-muted">
                      {attempt.submittedAt ? attempt.submittedAt.toLocaleDateString() : "—"}
                    </td>
                    {released ? (
                      <>
                        <td className="px-4 py-3 tabular-nums">
                          {band(attempt.score?.listeningBand)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {band(attempt.score?.readingBand)}
                        </td>
                        <td className="px-4 py-3">
                          {attempt.score?.writingBand == null ? (
                            <Badge variant="warning">Pending</Badge>
                          ) : (
                            <span className="tabular-nums">{band(attempt.score.writingBand)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {attempt.score?.overallBand == null ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <Badge variant="success">{band(attempt.score.overallBand)}</Badge>
                          )}
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-muted" colSpan={4}>
                        <Badge variant="muted">Awaiting release</Badge>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      {released ? (
                        <Link
                          href={`/results/${attempt.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          View
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
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
