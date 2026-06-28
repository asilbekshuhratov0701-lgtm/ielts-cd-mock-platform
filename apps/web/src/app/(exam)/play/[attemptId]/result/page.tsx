import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface QuestionResult {
  questionId: string;
  kind: string;
  correct: boolean;
  marks: number;
  maxMarks: number;
}

export default async function PlayResultPage({
  params
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const attempt = await prisma.blueprintAttempt.findUnique({
    where: { id: attemptId },
    include: { blueprint: true }
  });
  if (!attempt || attempt.candidateId !== session.user.id) notFound();
  if (attempt.status !== "submitted") redirect(`/play/${attemptId}`);

  const result = attempt.resultJson as unknown as { perQuestion?: QuestionResult[] } | null;
  const perQuestion = result?.perQuestion ?? [];
  const raw = attempt.rawScore ?? 0;
  const total = attempt.totalScore ?? 0;
  const pct = total > 0 ? Math.round((raw / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Card className="p-8 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">Exam submitted</h1>
        <p className="mt-1 text-sm text-muted">{attempt.blueprint.title}</p>
        <p className="mt-6 text-4xl font-bold text-foreground">
          {raw}
          <span className="text-2xl font-medium text-muted"> / {total}</span>
        </p>
        <p className="mt-1 text-sm text-muted">{pct}% correct</p>
        <div className="mt-6 flex justify-center">
          <Link href="/play">
            <Button variant="outline">Back to exams</Button>
          </Link>
        </div>
      </Card>

      {perQuestion.length > 0 ? (
        <Card className="mt-5 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Per-question
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {perQuestion.map((q) => (
              <span
                key={q.questionId}
                title={`${q.questionId}: ${q.correct ? "correct" : "incorrect"}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                  q.correct
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                )}
              >
                {q.correct ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {q.kind}
              </span>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
