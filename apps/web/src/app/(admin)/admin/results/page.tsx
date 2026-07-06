import Link from "next/link";
import { auth } from "@/auth";
import { prisma, Prisma } from "@ielts/db";
import { getReleaseMode } from "@/lib/settings";
import {
  releaseResultAction,
  holdResultAction,
  releaseAllHeldAction
} from "@/lib/results-actions";
import { releaseMockResultAction, holdMockResultAction } from "@/lib/mock-actions";
import { partSummaryBand, overallBandFrom, bandLabel } from "@/lib/mock-band";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export const metadata = { title: "Results" };
export const dynamic = "force-dynamic";

const SCORED_STATUSES = ["SUBMITTED", "GRADED", "PUBLISHED"] as const;

const fieldClass =
  "h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function band(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(1);
}

export default async function AdminResultsPage({
  searchParams
}: {
  searchParams: Promise<{ exam?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const examFilter = first(sp.exam);
  const statusFilter = first(sp.status);

  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const orgId = me?.orgId ?? "";

  const where: Prisma.AttemptWhereInput = {
    exam: { orgId },
    status: { in: [...SCORED_STATUSES] }
  };
  if (examFilter) where.examId = examFilter;
  if (statusFilter === "released") where.score = { is: { publishedAt: { not: null } } };
  else if (statusFilter === "held") where.score = { is: { publishedAt: null } };

  const [releaseMode, examRows, attempts, heldCount] = await Promise.all([
    getReleaseMode(orgId),
    prisma.attempt.findMany({
      where: { exam: { orgId }, status: { in: [...SCORED_STATUSES] } },
      distinct: ["examId"],
      orderBy: { examId: "asc" },
      select: { examId: true, exam: { select: { title: true } } }
    }),
    prisma.attempt.findMany({
      where,
      include: { exam: { select: { title: true } }, candidate: true, score: true },
      orderBy: { submittedAt: "desc" },
      take: 200
    }),
    prisma.attempt.count({
      where: {
        exam: { orgId },
        status: { in: [...SCORED_STATUSES] },
        score: { is: { publishedAt: null } },
        ...(examFilter ? { examId: examFilter } : {})
      }
    })
  ]);

  const exams = examRows
    .map((row) => ({ id: row.examId, title: row.exam.title }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const mockAttempts = await prisma.mockAttempt.findMany({
    where: { mockExam: { orgId }, status: "submitted" },
    include: { candidate: true, mockExam: { select: { title: true } } },
    orderBy: { submittedAt: "desc" },
    take: 200
  });

  return (
    <PageShell
      title="Results"
      subtitle="Review scored attempts and control when candidates can see their bands."
      actions={
        <Badge variant={releaseMode === "manual" ? "warning" : "success"}>
          {releaseMode === "manual" ? "Manual release" : "Auto release"}
        </Badge>
      }
    >
      {releaseMode === "manual" ? (
        <p className="text-xs text-muted">
          Manual mode: Listening &amp; Reading bands are scored on submit but stay hidden until you
          release them here. Writing exams are released when an examiner publishes the evaluation.
        </p>
      ) : null}

      <Card className="flex flex-wrap items-end justify-between gap-3 p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="exam">Exam</Label>
            <select
              id="exam"
              name="exam"
              defaultValue={examFilter}
              className={cn(fieldClass, "min-w-52")}
            >
              <option value="">All exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Visibility</Label>
            <select
              id="status"
              name="status"
              defaultValue={statusFilter}
              className={cn(fieldClass, "min-w-36")}
            >
              <option value="">All</option>
              <option value="held">Held</option>
              <option value="released">Released</option>
            </select>
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          {examFilter || statusFilter ? (
            <Link
              href="/admin/results"
              className="text-sm text-muted underline-offset-4 hover:text-brand-700 hover:underline"
            >
              Clear
            </Link>
          ) : null}
        </form>

        {heldCount > 0 ? (
          <form action={releaseAllHeldAction}>
            <input type="hidden" name="examId" value={examFilter} />
            <Button type="submit">
              Release all held ({heldCount}
              {examFilter ? " in exam" : ""})
            </Button>
          </form>
        ) : null}
      </Card>

      {attempts.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No attempts match these filters.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-brand-50/40 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">L</th>
                <th className="px-4 py-3 font-medium">R</th>
                <th className="px-4 py-3 font-medium">W</th>
                <th className="px-4 py-3 font-medium">Overall</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attempts.map((attempt) => {
                const released = attempt.score?.publishedAt != null;
                return (
                  <tr key={attempt.id} className="align-middle hover:bg-brand-50/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {attempt.candidate.name ?? attempt.candidate.email}
                    </td>
                    <td className="px-4 py-3 text-muted">{attempt.exam.title}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {attempt.submittedAt ? attempt.submittedAt.toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{band(attempt.score?.listeningBand)}</td>
                    <td className="px-4 py-3 tabular-nums">{band(attempt.score?.readingBand)}</td>
                    <td className="px-4 py-3 tabular-nums">{band(attempt.score?.writingBand)}</td>
                    <td className="px-4 py-3 tabular-nums">{band(attempt.score?.overallBand)}</td>
                    <td className="px-4 py-3">
                      {released ? (
                        <Badge variant="success">Released</Badge>
                      ) : (
                        <Badge variant="muted">Held</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {released ? (
                        <form action={holdResultAction}>
                          <input type="hidden" name="attemptId" value={attempt.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Hold
                          </Button>
                        </form>
                      ) : (
                        <form action={releaseResultAction}>
                          <input type="hidden" name="attemptId" value={attempt.id} />
                          <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                            disabled={!attempt.score}
                          >
                            Release
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-foreground/60">
        Mock exams
      </h2>
      {mockAttempts.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No submitted mock attempts yet.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-brand-50/40 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Overall band</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockAttempts.map((a) => {
                const r = a.resultJson as unknown as {
                  parts?: { module: string; rawScore: number; totalScore: number; band?: number | null }[];
                } | null;
                const overall = overallBandFrom((r?.parts ?? []).map(partSummaryBand));
                return (
                  <tr key={a.id} className="align-middle hover:bg-brand-50/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {a.candidate.name ?? a.candidate.email}
                    </td>
                    <td className="px-4 py-3 text-muted">{a.mockExam.title}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {a.submittedAt ? a.submittedAt.toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-brand-700">
                      {bandLabel(overall)}
                    </td>
                    <td className="px-4 py-3">
                      {a.resultsReleased ? (
                        <Badge variant="success">Released</Badge>
                      ) : (
                        <Badge variant="muted">Held</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.resultsReleased ? (
                        <form action={holdMockResultAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Hold
                          </Button>
                        </form>
                      ) : (
                        <form action={releaseMockResultAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            Release
                          </Button>
                        </form>
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
