"use server";

import { redirect } from "next/navigation";
import { prisma, Prisma } from "@ielts/db";
import {
  computeDeadline,
  isExpired,
  remainingSeconds,
  scoreImportedExam,
  type CandidateAnswer,
  type ImportAnswerKey
} from "@ielts/core";
import { blueprintAnswersSchema, MAX_ANNOTATIONS_BYTES } from "@ielts/validators";
import { auth } from "@/auth";
import { durationSecFor } from "@/lib/mock";

type AnswersMap = Record<string, string | string[] | null>;

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function startBlueprintAttemptAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const blueprintId = String(formData.get("blueprintId") ?? "");
  if (!blueprintId) redirect("/play");

  const bp = await prisma.examBlueprint.findUnique({ where: { id: blueprintId } });
  if (!bp || bp.state !== "published") redirect("/play");

  const existing = await prisma.blueprintAttempt.findFirst({
    where: { blueprintId, candidateId: userId, status: "in_progress" }
  });
  if (existing) redirect(`/play/${existing.id}`);

  const startedAt = new Date();
  const deadlineAt = computeDeadline(startedAt, durationSecFor(bp.module, bp.timeLimitMin));
  let attemptId: string | null = null;
  try {
    const attempt = await prisma.blueprintAttempt.create({
      data: {
        blueprintId,
        candidateId: userId,
        startedAt,
        deadlineAt,
        status: "in_progress",
        answersJson: {} as Prisma.InputJsonValue
      }
    });
    attemptId = attempt.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await prisma.blueprintAttempt.findFirst({
        where: { blueprintId, candidateId: userId, status: "in_progress" }
      });
      attemptId = again?.id ?? null;
    }
    if (!attemptId) throw e;
  }
  redirect(`/play/${attemptId}`);
}

export async function beginSectionAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const attemptId = String(formData.get("attemptId") ?? "");
  if (!attemptId) redirect("/play");

  const attempt = await prisma.blueprintAttempt.findUnique({
    where: { id: attemptId },
    include: { blueprint: { select: { module: true, timeLimitMin: true } } }
  });
  if (!attempt || attempt.candidateId !== userId) redirect("/play");

  const back = attempt.mockAttemptId ? `/play/mock/${attempt.mockAttemptId}` : `/play/${attemptId}`;
  if (attempt.status !== "in_progress" || attempt.beganAt) redirect(back);

  const now = new Date();
  const deadlineAt = computeDeadline(
    now,
    durationSecFor(attempt.blueprint.module, attempt.blueprint.timeLimitMin)
  );
  await prisma.blueprintAttempt.updateMany({
    where: { id: attemptId, beganAt: null, status: "in_progress" },
    data: { beganAt: now, startedAt: now, deadlineAt }
  });
  redirect(back);
}

export async function saveBlueprintAnswers(
  attemptId: string,
  answers: AnswersMap
): Promise<{ ok: boolean; remainingSec: number; expired: boolean; paused: boolean }> {
  const userId = await requireUserId();
  const attempt = await prisma.blueprintAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.candidateId !== userId) {
    return { ok: false, remainingSec: 0, expired: true, paused: false };
  }
  const parsed = blueprintAnswersSchema.safeParse(answers);
  if (!parsed.success) {
    return {
      ok: false,
      remainingSec: remainingSeconds(attempt.deadlineAt),
      expired: false,
      paused: attempt.pausedAt !== null
    };
  }
  if (attempt.pausedAt) {
    return {
      ok: false,
      remainingSec: Math.max(0, attempt.pausedRemainingSec ?? 0),
      expired: false,
      paused: true
    };
  }
  if (isExpired(attempt.deadlineAt) || attempt.status !== "in_progress") {
    return {
      ok: false,
      remainingSec: remainingSeconds(attempt.deadlineAt),
      expired: true,
      paused: false
    };
  }
  const res = await prisma.blueprintAttempt.updateMany({
    where: {
      id: attemptId,
      candidateId: userId,
      status: "in_progress",
      pausedAt: null,
      deadlineAt: { gt: new Date() }
    },
    data: { answersJson: parsed.data as Prisma.InputJsonValue }
  });
  const expired = res.count === 0;
  return { ok: !expired, remainingSec: remainingSeconds(attempt.deadlineAt), expired, paused: false };
}

export async function saveBlueprintAnnotations(
  attemptId: string,
  annotations: unknown
): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  let serialized: string;
  try {
    serialized = JSON.stringify(annotations ?? null);
  } catch {
    return { ok: false };
  }
  if (serialized.length > MAX_ANNOTATIONS_BYTES) return { ok: false };
  const res = await prisma.blueprintAttempt.updateMany({
    where: { id: attemptId, candidateId: userId, status: "in_progress" },
    data: { annotationsJson: annotations as Prisma.InputJsonValue }
  });
  return { ok: res.count > 0 };
}

export async function submitBlueprintAttemptAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const attemptId = String(formData.get("attemptId") ?? "");
  if (!attemptId) redirect("/play");

  const attempt = await prisma.blueprintAttempt.findUnique({
    where: { id: attemptId },
    include: { blueprint: true }
  });
  if (!attempt || attempt.candidateId !== userId) redirect("/play");
  if (attempt.status === "submitted") redirect(`/play/${attemptId}/result`);
  if (attempt.pausedAt) redirect(`/play/${attemptId}`);

  const answerKey = attempt.blueprint.answerKeyJson as unknown as Record<string, ImportAnswerKey>;
  const answers = attempt.answersJson as unknown as Record<string, CandidateAnswer>;
  const score = scoreImportedExam(answerKey, answers);

  await prisma.blueprintAttempt.update({
    where: { id: attemptId },
    data: {
      status: "submitted",
      submittedAt: new Date(),
      rawScore: score.correct,
      totalScore: score.total,
      resultJson: score as unknown as Prisma.InputJsonValue
    }
  });
  redirect(`/play/${attemptId}/result`);
}
