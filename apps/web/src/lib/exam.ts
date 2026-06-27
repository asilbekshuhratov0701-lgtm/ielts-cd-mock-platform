import { prisma, Prisma } from "@ielts/db";
import { computeDeadline, isExpired, remainingSeconds } from "@ielts/core";
import { scoreAttempt } from "@/lib/scoring";
import { isCompletionLayout, type CompletionLayout } from "@/lib/completion-layout";

export class ExamError extends Error {
  constructor(
    public code: "NOT_FOUND" | "FORBIDDEN" | "EXPIRED" | "INVALID" | "CONFLICT",
    message: string
  ) {
    super(message);
  }
}

export type RunnerQuestion = {
  id: string;
  number: number;
  prompt: string;
  answerType: string;
  options: { value: string; label: string }[];
};

export type RunnerGroup = {
  id: string;
  type: string;
  instructions: string;
  order: number;
  layout: CompletionLayout | null;
  questions: RunnerQuestion[];
};

export type RunnerSectionMeta = {
  id: string;
  kind: string;
  order: number;
  durationSec: number;
  startedAt: string | null;
  deadlineAt: string | null;
  submittedAt: string | null;
};

export type RunnerCurrent = {
  sectionId: string;
  kind: string;
  deadlineAt: string;
  remainingSec: number;
  groups: RunnerGroup[];
  passages: { id: string; order: number; title: string | null; body: string }[];
  writingTasks: { id: string; taskNo: number; prompt: string; minWords: number }[];
  answers: Record<string, unknown>;
  flags: Record<string, boolean>;
  writing: Record<number, string>;
};

export type RunnerState = {
  attemptId: string;
  examTitle: string;
  status: string;
  serverNow: string;
  currentSectionId: string | null;
  sections: RunnerSectionMeta[];
  current: RunnerCurrent | null;
};

function jsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function wordCount(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

async function loadAttempt(attemptId: string, candidateId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { include: { sections: { orderBy: { order: "asc" } } } },
      sectionAttempts: true
    }
  });
  if (!attempt) throw new ExamError("NOT_FOUND", "Attempt not found");
  if (attempt.candidateId !== candidateId) throw new ExamError("FORBIDDEN", "Not your attempt");
  return attempt;
}

type LoadedAttempt = Awaited<ReturnType<typeof loadAttempt>>;

function currentSection(attempt: LoadedAttempt) {
  if (!attempt.currentSection) return null;
  return (
    attempt.exam.sections.find(
      (s) =>
        s.kind === attempt.currentSection &&
        !attempt.sectionAttempts.find((sa) => sa.sectionId === s.id)?.submittedAt
    ) ??
    attempt.exam.sections.find((s) => s.kind === attempt.currentSection) ??
    null
  );
}

function sectionAttemptFor(attempt: LoadedAttempt, sectionId: string) {
  return attempt.sectionAttempts.find((sa) => sa.sectionId === sectionId) ?? null;
}

export async function startAttempt(candidateId: string, examId: string): Promise<string> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { sections: { orderBy: { order: "asc" } } }
  });
  if (!exam) throw new ExamError("NOT_FOUND", "Exam not found");

  const existing = await prisma.attempt.findFirst({
    where: { examId, candidateId, status: "IN_PROGRESS" }
  });
  if (existing) return existing.id;

  const first = exam.sections[0];
  const now = new Date();
  const attempt = await prisma.attempt.create({
    data: {
      examId,
      candidateId,
      status: "IN_PROGRESS",
      startedAt: now,
      currentSection: first ? first.kind : null,
      sectionAttempts: first
        ? {
            create: {
              sectionId: first.id,
              startedAt: now,
              deadlineAt: computeDeadline(now, first.durationSec),
              lastHeartbeatAt: now
            }
          }
        : undefined
    }
  });
  return attempt.id;
}

export async function loadRunnerState(
  attemptId: string,
  candidateId: string
): Promise<RunnerState> {
  const attempt = await loadAttempt(attemptId, candidateId);
  const sections = attempt.exam.sections;

  const sectionsMeta: RunnerSectionMeta[] = sections.map((s) => {
    const sa = sectionAttemptFor(attempt, s.id);
    return {
      id: s.id,
      kind: s.kind,
      order: s.order,
      durationSec: s.durationSec,
      startedAt: sa?.startedAt?.toISOString() ?? null,
      deadlineAt: sa?.deadlineAt?.toISOString() ?? null,
      submittedAt: sa?.submittedAt?.toISOString() ?? null
    };
  });

  let current: RunnerCurrent | null = null;
  const sec = attempt.status === "IN_PROGRESS" ? currentSection(attempt) : null;
  const sa = sec ? sectionAttemptFor(attempt, sec.id) : null;

  if (sec && sa?.deadlineAt) {
    const full = await prisma.examSection.findUnique({
      where: { id: sec.id },
      include: {
        questionGroups: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { number: "asc" },
              include: { options: { orderBy: { order: "asc" } } }
            }
          }
        },
        passages: { orderBy: { order: "asc" } },
        writingTasks: { orderBy: { taskNo: "asc" } }
      }
    });

    const answerRows = await prisma.answer.findMany({ where: { sectionAttemptId: sa.id } });
    const writingRows = await prisma.writingSubmission.findMany({
      where: { attemptId: attempt.id }
    });

    const answers: Record<string, unknown> = {};
    const flags: Record<string, boolean> = {};
    for (const row of answerRows) {
      answers[row.questionId] = row.responseJson ?? null;
      if (row.isFlagged) flags[row.questionId] = true;
    }
    const writing: Record<number, string> = {};
    for (const row of writingRows) writing[row.taskNo] = row.contentText;

    current = {
      sectionId: sec.id,
      kind: sec.kind,
      deadlineAt: sa.deadlineAt.toISOString(),
      remainingSec: remainingSeconds(sa.deadlineAt),
      groups: (full?.questionGroups ?? []).map((g) => ({
        id: g.id,
        type: g.type,
        instructions: g.instructionsRichtext,
        order: g.order,
        layout: isCompletionLayout(g.layoutJson) ? g.layoutJson : null,
        questions: g.questions.map((q) => ({
          id: q.id,
          number: q.number,
          prompt: q.prompt,
          answerType: q.answerType,
          options: q.options.map((o) => ({ value: o.value, label: o.label }))
        }))
      })),
      passages: (full?.passages ?? []).map((p) => ({
        id: p.id,
        order: p.order,
        title: p.title,
        body: p.bodyRichtext
      })),
      writingTasks: (full?.writingTasks ?? []).map((w) => ({
        id: w.id,
        taskNo: w.taskNo,
        prompt: w.promptRichtext,
        minWords: w.minWords
      })),
      answers,
      flags,
      writing
    };
  }

  return {
    attemptId: attempt.id,
    examTitle: attempt.exam.title,
    status: attempt.status,
    serverNow: new Date().toISOString(),
    currentSectionId: sec?.id ?? null,
    sections: sectionsMeta,
    current
  };
}

async function requireOpenSection(attemptId: string, candidateId: string) {
  const attempt = await loadAttempt(attemptId, candidateId);
  if (attempt.status !== "IN_PROGRESS") throw new ExamError("CONFLICT", "Attempt not in progress");
  const sec = currentSection(attempt);
  const sa = sec ? sectionAttemptFor(attempt, sec.id) : null;
  if (!sec || !sa?.deadlineAt) throw new ExamError("CONFLICT", "No active section");
  if (isExpired(sa.deadlineAt)) throw new ExamError("EXPIRED", "Section time has ended");
  return { attempt, sec, sa };
}

export async function saveAnswer(
  attemptId: string,
  candidateId: string,
  questionId: string,
  response: unknown,
  isFlagged?: boolean
): Promise<{ savedAt: string }> {
  const { sa } = await requireOpenSection(attemptId, candidateId);
  await prisma.answer.upsert({
    where: { sectionAttemptId_questionId: { sectionAttemptId: sa.id, questionId } },
    update: {
      responseJson: jsonValue(response),
      ...(isFlagged === undefined ? {} : { isFlagged })
    },
    create: {
      sectionAttemptId: sa.id,
      questionId,
      responseJson: jsonValue(response),
      isFlagged: isFlagged ?? false
    }
  });
  return { savedAt: new Date().toISOString() };
}

export async function saveWriting(
  attemptId: string,
  candidateId: string,
  taskNo: number,
  content: string
): Promise<{ savedAt: string; wordCount: number }> {
  const { sec } = await requireOpenSection(attemptId, candidateId);
  if (sec.kind !== "WRITING") throw new ExamError("INVALID", "Not the writing section");

  const task = await prisma.writingTask.findFirst({ where: { sectionId: sec.id, taskNo } });
  const existing = await prisma.writingSubmission.findFirst({ where: { attemptId, taskNo } });
  const wc = wordCount(content);

  if (existing) {
    await prisma.writingSubmission.update({
      where: { id: existing.id },
      data: { contentText: content, wordCount: wc }
    });
  } else {
    await prisma.writingSubmission.create({
      data: { attemptId, taskNo, contentText: content, wordCount: wc, writingTaskId: task?.id }
    });
  }
  return { savedAt: new Date().toISOString(), wordCount: wc };
}

export async function heartbeat(
  attemptId: string,
  candidateId: string
): Promise<{ remainingSec: number; expired: boolean }> {
  const attempt = await loadAttempt(attemptId, candidateId);
  const sec = currentSection(attempt);
  const sa = sec ? sectionAttemptFor(attempt, sec.id) : null;
  if (!sa?.deadlineAt) return { remainingSec: 0, expired: true };
  await prisma.sectionAttempt.update({
    where: { id: sa.id },
    data: { lastHeartbeatAt: new Date() }
  });
  return { remainingSec: remainingSeconds(sa.deadlineAt), expired: isExpired(sa.deadlineAt) };
}

export async function advanceSection(
  attemptId: string,
  candidateId: string
): Promise<{ finished: boolean; nextKind: string | null }> {
  const attempt = await loadAttempt(attemptId, candidateId);
  if (attempt.status !== "IN_PROGRESS") throw new ExamError("CONFLICT", "Attempt not in progress");

  const sec = currentSection(attempt);
  if (!sec) throw new ExamError("CONFLICT", "No active section");

  const sa = sectionAttemptFor(attempt, sec.id);
  const now = new Date();
  if (sa && !sa.submittedAt) {
    await prisma.sectionAttempt.update({ where: { id: sa.id }, data: { submittedAt: now } });
  }

  const next = attempt.exam.sections.find((s) => s.order > sec.order);
  if (!next) {
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: { status: "SUBMITTED", submittedAt: now, currentSection: null }
    });
    try {
      await scoreAttempt(attempt.id);
    } catch (error) {
      console.error("scoreAttempt failed", error);
    }
    return { finished: true, nextKind: null };
  }

  await prisma.$transaction([
    prisma.sectionAttempt.upsert({
      where: { attemptId_sectionId: { attemptId: attempt.id, sectionId: next.id } },
      update: {
        startedAt: now,
        deadlineAt: computeDeadline(now, next.durationSec),
        lastHeartbeatAt: now
      },
      create: {
        attemptId: attempt.id,
        sectionId: next.id,
        startedAt: now,
        deadlineAt: computeDeadline(now, next.durationSec),
        lastHeartbeatAt: now
      }
    }),
    prisma.attempt.update({ where: { id: attempt.id }, data: { currentSection: next.kind } })
  ]);

  return { finished: false, nextKind: next.kind };
}
