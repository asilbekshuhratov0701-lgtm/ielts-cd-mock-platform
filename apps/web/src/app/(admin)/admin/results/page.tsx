import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { getReleaseMode } from "@/lib/settings";
import { releaseResultAction, holdResultAction } from "@/lib/results-actions";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Results" };
export const dynamic = "force-dynamic";

function band(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(1);
}

export default async function AdminResultsPage() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const orgId = me?.orgId ?? "";

  const [releaseMode, attempts] = await Promise.all([
    getReleaseMode(orgId),
    prisma.attempt.findMany({
      where: { exam: { orgId }, status: { in: ["SUBMITTED", "GRADED", "PUBLISHED"] } },
      include: { exam: { select: { title: true } }, candidate: true, score: true },
      orderBy: { submittedAt: "desc" },
      take: 200
    })
  ]);

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

      {attempts.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No submitted attempts yet.</Card>
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
    </PageShell>
  );
}
