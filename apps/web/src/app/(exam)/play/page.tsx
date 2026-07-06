import Link from "next/link";
import { redirect } from "next/navigation";
import { Headphones, BookOpen, PenLine, Play } from "lucide-react";
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
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Available exams</h1>
      <p className="mt-1 text-sm text-muted">Full IELTS mock exams you can take end-to-end.</p>

      <div className="mt-6 space-y-3">
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
              <Card key={mock.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{mock.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {mock.parts.map((p) => (
                      <Badge key={p.id} variant="muted">
                        <span className="mr-1 inline-flex align-middle">
                          {moduleIcon[p.module as keyof typeof moduleIcon] ?? null}
                        </span>
                        {p.module}
                      </Badge>
                    ))}
                    <span className="text-xs text-muted">{totalQuestions} questions</span>
                  </div>
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
                      Band {bandLabel(overall)}
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
