import Link from "next/link";
import { redirect } from "next/navigation";
import { Headphones, BookOpen, PenLine, Play } from "lucide-react";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startBlueprintAttemptAction } from "@/lib/blueprint-play-actions";

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

  const blueprints = await prisma.examBlueprint.findMany({
    where: { orgId: dbUser.orgId, state: "published" },
    orderBy: { publishedAt: "desc" }
  });
  const attempts = await prisma.blueprintAttempt.findMany({
    where: { candidateId: dbUser.id },
    orderBy: { createdAt: "desc" }
  });
  const inProgress = new Map(
    attempts.filter((a) => a.status === "in_progress").map((a) => [a.blueprintId, a])
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Available exams</h1>
      <p className="mt-1 text-sm text-muted">Published mock exams you can take.</p>

      <div className="mt-6 space-y-3">
        {blueprints.length === 0 ? (
          <Card className="p-6 text-sm text-muted">No published exams yet.</Card>
        ) : (
          blueprints.map((b) => {
            const resume = inProgress.get(b.id);
            return (
              <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2">
                  {moduleIcon[b.module as keyof typeof moduleIcon] ?? null}
                  <span className="font-medium text-foreground">{b.title}</span>
                  <Badge variant="muted">
                    {b.module} · {b.totalQuestions} questions
                  </Badge>
                </div>
                {resume ? (
                  <Link href={`/play/${resume.id}`}>
                    <Button>
                      <Play className="h-4 w-4" /> Resume
                    </Button>
                  </Link>
                ) : (
                  <form action={startBlueprintAttemptAction}>
                    <input type="hidden" name="blueprintId" value={b.id} />
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

      {attempts.some((a) => a.status === "submitted") ? (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Past attempts
          </h2>
          <div className="space-y-2">
            {attempts
              .filter((a) => a.status === "submitted")
              .map((a) => (
                <Link key={a.id} href={`/play/${a.id}/result`}>
                  <Card className="flex items-center justify-between p-3 text-sm transition-colors hover:bg-brand-50/40">
                    <span className="text-muted">
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "submitted"}
                    </span>
                    <span className="font-semibold text-foreground">
                      {a.rawScore ?? 0} / {a.totalScore ?? 0}
                    </span>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
