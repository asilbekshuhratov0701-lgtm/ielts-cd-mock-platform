import { Activity, CheckCircle2, FileText, PenLine, Trophy, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Admin Dashboard" };

function band(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(1);
}

export default async function AdminOverviewPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const orgId = user?.orgId ?? "";
  const scope = { exam: { orgId } };

  const [candidates, publishedExams, totalExams, writingPending, activeSessions, scores, recent] =
    await Promise.all([
      prisma.user.count({ where: { orgId, role: "CANDIDATE" } }),
      prisma.exam.count({ where: { orgId, status: "PUBLISHED" } }),
      prisma.exam.count({ where: { orgId } }),
      prisma.attempt.count({ where: { ...scope, status: "SUBMITTED" } }),
      prisma.attempt.count({ where: { ...scope, status: "IN_PROGRESS" } }),
      prisma.score.findMany({
        where: { overallBand: { not: null }, attempt: scope },
        select: { overallBand: true }
      }),
      prisma.attempt.findMany({
        where: { ...scope, status: { in: ["SUBMITTED", "GRADED", "PUBLISHED"] } },
        include: { exam: true, candidate: true, score: true },
        orderBy: { submittedAt: "desc" },
        take: 6
      })
    ]);

  const avgBand =
    scores.length > 0 ? scores.reduce((s, r) => s + (r.overallBand ?? 0), 0) / scores.length : null;

  return (
    <PageShell title="Overview" subtitle="Key metrics across your centre.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Candidates" value={candidates} icon={Users} />
        <StatCard
          label="Published exams"
          value={publishedExams}
          icon={FileText}
          hint={`${totalExams} total`}
        />
        <StatCard label="Writing pending" value={writingPending} icon={PenLine} />
        <StatCard
          label="Average band"
          value={avgBand == null ? "—" : band(avgBand)}
          icon={Trophy}
        />
        <StatCard label="Active sessions" value={activeSessions} icon={Activity} />
        <StatCard label="Completed results" value={scores.length} icon={CheckCircle2} />
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-foreground">Recent results</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No submissions yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((attempt) => (
              <li key={attempt.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {attempt.candidate.name ?? attempt.candidate.email}
                  </p>
                  <p className="truncate text-xs text-muted">{attempt.exam.title}</p>
                </div>
                <div className="flex items-center gap-2">
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
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageShell>
  );
}
