import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildAnswerRows } from "@/lib/mock-review";
import { skillBand, overallBandFrom, bandLabel } from "@/lib/mock-band";
import type { PreviewExam } from "@/lib/exam-import-map";
import type { CandidateAnswer, ImportAnswerKey } from "@ielts/core";
import { cn } from "@/lib/cn";

export default async function MockAttemptReviewPage({
  params
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) redirect("/login");

  const attempt = await prisma.mockAttempt.findUnique({
    where: { id: attemptId },
    include: {
      candidate: { select: { name: true, email: true } },
      mockExam: { select: { id: true, title: true, orgId: true } },
      partAttempts: { include: { blueprint: true }, orderBy: { partOrder: "asc" } }
    }
  });
  if (!attempt || attempt.mockExam.id !== id || attempt.mockExam.orgId !== me.orgId) notFound();

  const overall = overallBandFrom(
    attempt.partAttempts.map((p) =>
      skillBand(p.blueprint.module, p.rawScore ?? 0, p.totalScore ?? 0)
    )
  );

  return (
    <PageShell
      title={attempt.candidate.name ?? attempt.candidate.email}
      subtitle={`${attempt.mockExam.title} · ${
        attempt.submittedAt ? attempt.submittedAt.toLocaleString() : "in progress"
      }`}
      actions={
        <Badge variant={attempt.status === "submitted" ? "success" : "warning"}>
          {attempt.status === "submitted" ? `Overall band ${bandLabel(overall)}` : attempt.status}
        </Badge>
      }
    >
      <Link
        href={`/admin/exam-import/mock/${id}`}
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to mock
      </Link>

      {attempt.partAttempts.map((part) => {
        const engine = part.blueprint.engineJson as unknown as PreviewExam;
        const answerKey = part.blueprint.answerKeyJson as unknown as Record<string, ImportAnswerKey>;
        const answers = part.answersJson as unknown as Record<string, CandidateAnswer>;
        const rows = buildAnswerRows(engine, answerKey, answers);

        return (
          <Card key={part.id} className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-foreground">
                <span className="capitalize">{part.blueprint.module}</span>
                <span className="ml-2 text-sm font-normal text-muted">{part.blueprint.title}</span>
              </h2>
              <span className="flex items-center gap-3 text-sm">
                {part.blueprint.module === "writing" ? (
                  <span className="text-muted">examiner-marked</span>
                ) : (
                  <span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
                    Band{" "}
                    {bandLabel(
                      skillBand(part.blueprint.module, part.rawScore ?? 0, part.totalScore ?? 0)
                    )}
                  </span>
                )}
                <span className="font-semibold tabular-nums text-foreground">
                  {part.rawScore ?? 0} / {part.totalScore ?? 0}
                </span>
              </span>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-muted">
                No auto-scored answers for this part
                {part.blueprint.module === "writing" ? " (writing is examiner-marked)." : "."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="w-16 px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Candidate answer</th>
                      <th className="px-3 py-2 font-medium">Accepted answer</th>
                      <th className="w-16 px-3 py-2 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => (
                      <tr key={r.number} className="align-top">
                        <td className="px-3 py-2 font-medium tabular-nums text-foreground">
                          {r.number}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2",
                            r.correct ? "text-foreground" : "text-red-700"
                          )}
                        >
                          {r.candidate}
                        </td>
                        <td className="px-3 py-2 text-muted">{r.accepted}</td>
                        <td className="px-3 py-2">
                          {r.correct ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
    </PageShell>
  );
}
