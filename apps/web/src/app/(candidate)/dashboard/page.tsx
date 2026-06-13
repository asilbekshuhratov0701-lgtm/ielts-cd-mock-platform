import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Dashboard" };

function band(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(1);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [attempts, inProgress] = await Promise.all([
    prisma.attempt.findMany({
      where: {
        candidateId: session.user.id,
        status: { in: ["SUBMITTED", "GRADED", "PUBLISHED"] }
      },
      include: { exam: true, score: true },
      orderBy: { submittedAt: "desc" }
    }),
    prisma.attempt.count({ where: { candidateId: session.user.id, status: "IN_PROGRESS" } })
  ]);

  const overalls = attempts
    .map((a) => a.score?.overallBand)
    .filter((b): b is number => typeof b === "number");
  const avgOverall =
    overalls.length > 0 ? overalls.reduce((s, b) => s + b, 0) / overalls.length : null;

  return (
    <PageShell
      title={`Welcome${session.user.name ? `, ${session.user.name}` : ""}`}
      subtitle="Your exams, scores and progress at a glance."
      actions={
        <Link href="/exams">
          <Button>
            Start an exam <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Exams completed" value={attempts.length} icon={CheckCircle2} />
        <StatCard label="In progress" value={inProgress} icon={Clock} />
        <StatCard
          label="Average overall band"
          value={avgOverall == null ? "—" : band(avgOverall)}
          icon={Trophy}
          hint={
            overalls.length > 0 ? `Across ${overalls.length} published result(s)` : "No results yet"
          }
        />
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent results</h2>
          <Link href="/results" className="text-sm font-medium text-brand-700 hover:underline">
            View all
          </Link>
        </div>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted">No completed exams yet. Start your first mock above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {attempts.slice(0, 5).map((attempt) => (
              <li key={attempt.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{attempt.exam.title}</p>
                  <p className="text-xs text-muted">
                    {attempt.submittedAt ? attempt.submittedAt.toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Badge variant="muted">L {band(attempt.score?.listeningBand)}</Badge>
                  <Badge variant="muted">R {band(attempt.score?.readingBand)}</Badge>
                  <Badge variant={attempt.score?.writingBand == null ? "warning" : "muted"}>
                    W{" "}
                    {attempt.score?.writingBand == null
                      ? "pending"
                      : band(attempt.score.writingBand)}
                  </Badge>
                  {attempt.score?.overallBand != null ? (
                    <Badge variant="success">Overall {band(attempt.score.overallBand)}</Badge>
                  ) : null}
                </div>
                <Link
                  href={`/results/${attempt.id}`}
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageShell>
  );
}
