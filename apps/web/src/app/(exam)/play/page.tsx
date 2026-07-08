import Link from "next/link";
import { redirect } from "next/navigation";
import { Headphones, BookOpen, PenLine, Play, Monitor, ClipboardCheck } from "lucide-react";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startMockAttemptAction } from "@/lib/mock-actions";
import { partSummaryBand, overallBandFrom, bandLabel } from "@/lib/mock-band";

const moduleIcon = {
  reading: <BookOpen className="h-4 w-4 text-violet-600" />,
  listening: <Headphones className="h-4 w-4 text-violet-600" />,
  writing: <PenLine className="h-4 w-4 text-violet-600" />
} as const;

export default async function PlayListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser) redirect("/login");

  const groupIds = (
    await prisma.candidateGroupMember.findMany({
      where: { candidateId: dbUser.id },
      select: { groupId: true }
    })
  ).map((g) => g.groupId);

  const mocks = await prisma.mockExam.findMany({
    where: {
      orgId: dbUser.orgId,
      state: "published",
      assignments: { some: { OR: [{ candidateId: dbUser.id }, { groupId: { in: groupIds } }] } }
    },
    include: {
      parts: {
        include: { blueprint: { select: { module: true, totalQuestions: true } } },
        orderBy: { order: "asc" }
      }
    },
    orderBy: { publishedAt: "desc" }
  });
  const mockAttempts = await prisma.mockAttempt.findMany({
    where: { candidateId: dbUser.id },
    include: { mockExam: true },
    orderBy: { createdAt: "desc" }
  });
  const inProgress = new Map(
    mockAttempts.filter((a) => a.status === "in_progress").map((a) => [a.mockExamId, a])
  );
  const submitted = mockAttempts.filter((a) => a.status === "submitted");

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="text-sm text-muted">
        <Link href="/dashboard" className="hover:text-brand-700">
          Home
        </Link>{" "}
        <span className="mx-1 text-muted/60">›</span> Exams
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Available Exams</h1>
      <p className="mt-1 text-sm text-muted">Full IELTS mock exams you can take end-to-end.</p>

      <div className="mt-6 space-y-4">
        {mocks.length === 0 ? (
          <Card className="p-6 text-sm text-muted">No published mock exams yet.</Card>
        ) : (
          mocks.map((mock) => {
            const resume = inProgress.get(mock.id);
            const totalQuestions = mock.parts.reduce(
              (s, p) => s + (p.blueprint.totalQuestions ?? 0),
              0
            );
            return (
              <Card
                key={mock.id}
                className="overflow-hidden p-0 transition-shadow hover:shadow-card"
              >
                <div className="flex flex-col sm:flex-row">
                  <div
                    className="flex shrink-0 flex-col items-center justify-center gap-0.5 px-6 py-6 text-white sm:w-32"
                    style={{ background: "linear-gradient(135deg,#2563EB,#7C5CFC)" }}
                  >
                    <span className="text-4xl font-extrabold leading-none">{totalQuestions}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                      questions
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{mock.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {mock.parts.map((p) => (
                          <Badge key={p.id} variant="muted">
                            <span className="mr-1 inline-flex align-middle">
                              {moduleIcon[p.module as keyof typeof moduleIcon] ?? null}
                            </span>
                            <span className="capitalize">{p.module}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Monitor className="h-4 w-4 text-violet-600" /> IELTS on computer
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <ClipboardCheck className="h-4 w-4 text-violet-600" /> Reviewed by an
                          examiner
                        </span>
                      </div>
                      {resume ? (
                        <Link href={`/play/mock/${resume.id}`}>
                          <Button>
                            <Play className="h-4 w-4" /> Resume
                          </Button>
                        </Link>
                      ) : (
                        <form action={startMockAttemptAction}>
                          <input type="hidden" name="mockExamId" value={mock.id} />
                          <Button type="submit">
                            <Play className="h-4 w-4" /> Start exam
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {submitted.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Past attempts
          </h2>
          <div className="space-y-2">
            {submitted.map((a) => {
              const r = a.resultJson as unknown as {
                parts?: { module: string; rawScore: number; totalScore: number; band?: number | null }[];
              } | null;
              const overall = overallBandFrom((r?.parts ?? []).map(partSummaryBand));
              return (
                <Link key={a.id} href={`/play/mock/${a.id}/result`}>
                  <Card className="flex items-center justify-between p-3 text-sm transition-colors hover:bg-brand-50/40">
                    <span className="text-muted">
                      {a.mockExam.title}
                      {a.submittedAt ? ` · ${new Date(a.submittedAt).toLocaleDateString()}` : ""}
                    </span>
                    <span className="font-semibold text-foreground">
                      {a.resultsReleased ? `Band ${bandLabel(overall)}` : "Pending review"}
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
