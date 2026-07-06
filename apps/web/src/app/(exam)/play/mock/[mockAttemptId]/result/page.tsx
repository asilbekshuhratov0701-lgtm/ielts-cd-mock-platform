import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Headphones, BookOpen, PenLine } from "lucide-react";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { partSummaryBand, overallBandFrom, bandLabel } from "@/lib/mock-band";

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

  if (!attempt.resultsReleased) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Card className="p-8 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Exam submitted
          </h1>
          <p className="mt-1 text-sm text-muted">{attempt.mockExam.title}</p>
          <p className="mt-6 text-sm text-muted">
            Your responses have been received. Your result is being reviewed and will appear here
            once your examiner releases it.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/play">
              <Button variant="outline">Back to exams</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const summary = attempt.resultJson as unknown as {
    parts?: PartSummary[];
    rawScore?: number;
    totalScore?: number;
  } | null;
  const parts = summary?.parts ?? [];
  const partBands = parts.map((p) => ({ ...p, band: partSummaryBand(p) }));
  const overall = overallBandFrom(partBands.map((p) => p.band));

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Card className="p-8 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">Mock completed</h1>
        <p className="mt-1 text-sm text-muted">{attempt.mockExam.title}</p>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
          Overall band
        </p>
        <p className="text-5xl font-bold text-brand-700">{bandLabel(overall)}</p>
        <div className="mt-6 flex justify-center">
          <Link href="/play">
            <Button variant="outline">Back to exams</Button>
          </Link>
        </div>
      </Card>

      {partBands.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {partBands.map((p, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                {moduleIcon[p.module] ?? null}
                <span className="capitalize">{p.module}</span>
              </div>
              {p.module === "writing" ? (
                p.band === null ? (
                  <p className="mt-2 text-2xl font-bold text-muted">
                    —
                    <span className="ml-2 align-middle text-xs font-normal">
                      examiner-marked (pending)
                    </span>
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-3xl font-bold text-brand-700">{bandLabel(p.band)}</p>
                    <p className="text-xs text-muted">examiner-marked</p>
                  </>
                )
              ) : (
                <>
                  <p className="mt-2 text-3xl font-bold text-brand-700">{bandLabel(p.band)}</p>
                  <p className="text-xs text-muted">
                    {p.rawScore} / {p.totalScore} correct
                  </p>
                </>
              )}
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
