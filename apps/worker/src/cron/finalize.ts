import { prisma, Prisma } from "@ielts/db";
import {
  scoreImportedExam,
  type CandidateAnswer,
  type ImportAnswerKey
} from "@ielts/core";

/**
 * Server-authoritative finalizer. Runs every ~minute: scores and submits any
 * live attempt whose deadline has passed but that the client never auto-submitted
 * (tab closed, machine slept, throttled timer). Idempotent — every write carries a
 * status="in_progress" guard, so re-running is safe and races with a real submit
 * simply affect zero rows.
 */
export async function finalizeExpiredSessions(): Promise<void> {
  const now = new Date();

  const expiredParts = await prisma.blueprintAttempt.findMany({
    where: { status: "in_progress", deadlineAt: { lt: now } },
    include: { blueprint: true }
  });

  for (const part of expiredParts) {
    const answerKey = part.blueprint.answerKeyJson as unknown as Record<string, ImportAnswerKey>;
    const answers = part.answersJson as unknown as Record<string, CandidateAnswer>;
    const score = scoreImportedExam(answerKey, answers);
    await prisma.blueprintAttempt.updateMany({
      where: { id: part.id, status: "in_progress" },
      data: {
        status: "submitted",
        submittedAt: now,
        rawScore: score.correct,
        totalScore: score.total,
        resultJson: score as unknown as Prisma.InputJsonValue
      }
    });
  }

  const staleMocks = await prisma.mockAttempt.findMany({
    where: { status: "in_progress" },
    include: { mockExam: { include: { parts: true } } }
  });

  for (const mock of staleMocks) {
    const partAttempts = await prisma.blueprintAttempt.findMany({
      where: { mockAttemptId: mock.id },
      include: { blueprint: true },
      orderBy: { partOrder: "asc" }
    });
    if (partAttempts.length === 0) continue;

    const allSubmitted = partAttempts.every((p) => p.status === "submitted");
    const latestDeadline = partAttempts.reduce<Date | null>(
      (max, p) => (max === null || p.deadlineAt > max ? p.deadlineAt : max),
      null
    );
    const latestExpired = latestDeadline !== null && latestDeadline < now;

    if (!allSubmitted || !latestExpired) continue;

    const summary = {
      parts: partAttempts.map((p) => ({
        module: p.blueprint.module,
        title: p.blueprint.title,
        rawScore: p.rawScore ?? 0,
        totalScore: p.totalScore ?? 0
      })),
      rawScore: partAttempts.reduce((s, p) => s + (p.rawScore ?? 0), 0),
      totalScore: partAttempts.reduce((s, p) => s + (p.totalScore ?? 0), 0)
    };
    await prisma.mockAttempt.updateMany({
      where: { id: mock.id, status: "in_progress" },
      data: {
        status: "submitted",
        submittedAt: now,
        resultJson: summary as unknown as Prisma.InputJsonValue
      }
    });
  }
}
