import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Headphones, BookOpen, PenLine } from "lucide-react";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PartSummary {
  module: string;
  title: string;
  rawScore: number;
  totalScore: number;
}

const moduleIcon: Record<string, ReactNode> = {
  listening: <Headphones className="h-4 w-4 text-violet-600" />,
  reading: <BookOpen className="h-4 w-4 text-violet-600" />,
  writing: <PenLine className="h-4 w-4 text-violet-600" />
};

export default async function MockResultPage({
  params
}: {
  params: Promise<{ mockAttemptId: string }>;
}) {
  const { mockAttemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const attempt = await prisma.mockAttempt.findUnique({
    where: { id: mockAttemptId },
    include: { mockExam: true }
  });
  if (!attempt || attempt.candidateId !== session.user.id) notFound();
  if (attempt.status !== "submitted") redirect(`/play/mock/${mockAttemptId}`);

  const summary = attempt.resultJson as unknown as {
    parts?: PartSummary[];
    rawScore?: number;
    totalScore?: number;
  } | null;
  const parts = summary?.parts ?? [];
  const raw = summary?.rawScore ?? 0;
  const total = summary?.totalScore ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Card className="p-8 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">Mock completed</h1>
        <p className="mt-1 text-sm text-muted">{attempt.mockExam.title}</p>
        <p className="mt-6 text-4xl font-bold text-foreground">
          {raw}
          <span className="text-2xl font-medium text-muted"> / {total}</span>
        </p>
        <p className="mt-1 text-sm text-muted">objective marks across all parts</p>
        <div className="mt-6 flex justify-center">
          <Link href="/play">
            <Button variant="outline">Back to exams</Button>
          </Link>
        </div>
      </Card>

      {parts.length > 0 ? (
        <Card className="mt-5 divide-y divide-border p-2">
          {parts.map((p, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                {moduleIcon[p.module] ?? null}
                <span className="capitalize">{p.module}</span>
                <span className="text-muted">· {p.title}</span>
              </span>
              <span className="text-sm font-semibold text-foreground">
                {p.module === "writing" ? (
                  <span className="text-muted">examiner-marked</span>
                ) : (
                  <>
                    {p.rawScore} / {p.totalScore}
                  </>
                )}
              </span>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
