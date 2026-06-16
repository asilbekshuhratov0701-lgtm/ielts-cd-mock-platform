import { prisma, Prisma } from "@ielts/db";
import {
  overallBand,
  overallWritingBand,
  writingTaskBand,
  type WritingCriteria
} from "@ielts/core";
import { getNumberSetting, SETTING_KEYS } from "@/lib/settings";

export async function listPendingEvaluations() {
  return prisma.attempt.findMany({
    where: { status: { in: ["SUBMITTED", "GRADED"] }, writingSubmissions: { some: {} } },
    include: {
      exam: true,
      candidate: true,
      writingSubmissions: { include: { evaluation: true } },
      score: true
    },
    orderBy: { submittedAt: "asc" }
  });
}

export async function getAttemptWriting(attemptId: string) {
  return prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      candidate: true,
      writingSubmissions: { include: { evaluation: true }, orderBy: { taskNo: "asc" } },
      score: true
    }
  });
}

export async function saveEvaluation(
  attemptId: string,
  taskNo: number,
  examinerId: string,
  criteria: WritingCriteria,
  feedback?: string
): Promise<void> {
  const submission = await prisma.writingSubmission.findFirst({ where: { attemptId, taskNo } });
  if (!submission) throw new Error("Writing submission not found");

  const taskBand = writingTaskBand(criteria);
  await prisma.writingEvaluation.upsert({
    where: { submissionId: submission.id },
    update: {
      examinerId,
      criteriaJson: criteria as unknown as Prisma.InputJsonValue,
      taskBand,
      feedbackRichtext: feedback ?? null,
      status: "COMPLETED"
    },
    create: {
      submissionId: submission.id,
      examinerId,
      criteriaJson: criteria as unknown as Prisma.InputJsonValue,
      taskBand,
      feedbackRichtext: feedback ?? null,
      status: "COMPLETED"
    }
  });
}

export async function publishResult(attemptId: string): Promise<void> {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      writingSubmissions: { include: { evaluation: true } },
      score: true,
      exam: { select: { orgId: true } }
    }
  });
  if (!attempt) throw new Error("Attempt not found");

  const submissions = attempt.writingSubmissions;
  const evaluated = submissions.filter((s) => s.evaluation?.taskBand != null);
  if (submissions.length === 0 || evaluated.length < submissions.length) {
    throw new Error("All writing tasks must be evaluated before publishing");
  }

  const task1 = submissions.find((s) => s.taskNo === 1)?.evaluation?.taskBand ?? null;
  const task2 = submissions.find((s) => s.taskNo === 2)?.evaluation?.taskBand ?? null;

  const task2Weight = await getNumberSetting(attempt.exam.orgId, SETTING_KEYS.task2Weight, 2);

  let writingBand: number;
  if (task1 != null && task2 != null) writingBand = overallWritingBand(task1, task2, task2Weight);
  else writingBand = (task1 ?? task2) as number;

  const listening = attempt.score?.listeningBand ?? null;
  const reading = attempt.score?.readingBand ?? null;
  const overall =
    listening != null && reading != null ? overallBand(listening, reading, writingBand) : null;

  const submissionIds = submissions.map((s) => s.id);

  await prisma.$transaction([
    prisma.score.upsert({
      where: { attemptId },
      update: { writingBand, overallBand: overall, publishedAt: new Date() },
      create: { attemptId, writingBand, overallBand: overall, publishedAt: new Date() }
    }),
    prisma.writingEvaluation.updateMany({
      where: { submissionId: { in: submissionIds } },
      data: { status: "PUBLISHED" }
    }),
    prisma.attempt.update({ where: { id: attemptId }, data: { status: "PUBLISHED" } })
  ]);
}
