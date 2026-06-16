import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";

function band(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(1);
}

export default async function ResultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: { exam: true, score: true, writingSubmissions: true }
  });
  if (!attempt || attempt.candidateId !== session.user.id) notFound();

  if (attempt.score?.publishedAt == null) {
    return (
      <PageShell title={attempt.exam.title} subtitle="Detailed performance breakdown.">
        <Card className="p-8 text-center text-sm text-muted">
          Your results for this exam have not been released yet. They will appear here once your
          centre publishes them.
        </Card>
      </PageShell>
    );
  }

  const score = attempt.score;
  const rows = [
    { label: "Listening", value: score?.listeningBand, raw: score?.listeningRaw, pending: false },
    { label: "Reading", value: score?.readingBand, raw: score?.readingRaw, pending: false },
    { label: "Writing", value: score?.writingBand, raw: null, pending: score?.writingBand == null }
  ];

  return (
    <PageShell title={attempt.exam.title} subtitle="Detailed performance breakdown.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <Card key={row.label} className="p-5">
            <p className="text-sm text-muted">{row.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-brand-700">
              {row.pending ? (
                <span className="text-lg text-amber-600">Pending</span>
              ) : (
                band(row.value)
              )}
            </p>
            {row.raw != null ? (
              <p className="mt-1 text-xs text-muted">{row.raw} correct (raw)</p>
            ) : null}
          </Card>
        ))}
        <Card className="border-brand-200 bg-brand-50/40 p-5">
          <p className="text-sm text-muted">Overall band</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-brand-800">
            {score?.overallBand == null ? (
              <span className="text-lg text-muted">Awaiting Writing</span>
            ) : (
              band(score.overallBand)
            )}
          </p>
        </Card>
      </div>

      {attempt.writingSubmissions.length > 0 ? (
        <Card className="p-6">
          <h2 className="mb-3 font-semibold text-foreground">Writing submissions</h2>
          <ul className="space-y-1.5 text-sm text-muted">
            {attempt.writingSubmissions
              .sort((a, b) => a.taskNo - b.taskNo)
              .map((submission) => (
                <li key={submission.id} className="flex items-center justify-between">
                  <span>Task {submission.taskNo}</span>
                  <span>{submission.wordCount} words · awaiting examiner</span>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}
    </PageShell>
  );
}
