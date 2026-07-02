"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, Prisma } from "@ielts/db";
import {
  computeDeadline,
  scoreImportedExam,
  type CandidateAnswer,
  type ImportAnswerKey
} from "@ielts/core";
import { auth } from "@/auth";

export const MODULE_ORDER = ["listening", "reading", "writing"] as const;

function moduleRank(module: string): number {
  const i = MODULE_ORDER.indexOf(module as (typeof MODULE_ORDER)[number]);
  return i === -1 ? MODULE_ORDER.length : i;
}

function durationSecFor(module: string, timeLimitMin: number | null): number {
  if (timeLimitMin && timeLimitMin > 0) return timeLimitMin * 60;
  if (module === "listening") return 2040;
  return 3600;
}

async function requireStaff() {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "CANDIDATE") redirect("/login");
  return session.user;
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

async function orgIdFor(userId: string): Promise<string> {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) redirect("/login");
  return dbUser.orgId;
}

function refreshAdmin(id?: string) {
  revalidatePath("/admin/exam-import");
  if (id) revalidatePath(`/admin/exam-import/mock/${id}`);
}

export async function createMockAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const orgId = await orgIdFor(user.id);
  const title = String(formData.get("title") ?? "").trim();
  const blueprintIds = MODULE_ORDER.map((m) => String(formData.get(`part_${m}`) ?? "")).filter(
    (v) => v.length > 0
  );
  if (!title || blueprintIds.length === 0) {
    redirect("/admin/exam-import?error=mock_incomplete");
  }

  const blueprints = await prisma.examBlueprint.findMany({
    where: { id: { in: blueprintIds }, orgId }
  });
  if (blueprints.length === 0) redirect("/admin/exam-import?error=mock_incomplete");

  const ordered = [...blueprints].sort((a, b) => moduleRank(a.module) - moduleRank(b.module));

  const mock = await prisma.mockExam.create({
    data: {
      orgId,
      title,
      state: "draft",
      createdById: user.id,
      parts: {
        create: ordered.map((bp, index) => ({
          blueprintId: bp.id,
          module: bp.module,
          order: index
        }))
      }
    }
  });
  refreshAdmin(mock.id);
  redirect(`/admin/exam-import/mock/${mock.id}`);
}

export async function publishMockAction(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const mock = await prisma.mockExam.findUnique({
    where: { id },
    include: { parts: { include: { blueprint: true } } }
  });
  if (!mock || mock.parts.length === 0) {
    refreshAdmin(id);
    return;
  }
  const audioReady = mock.parts.every((p) => {
    const needsAudio = p.blueprint.module === "listening" && Boolean(p.blueprint.audioRef);
    return !needsAudio || Boolean(p.blueprint.audioMediaId);
  });
  if (!audioReady) {
    refreshAdmin(id);
    return;
  }
  const now = new Date();
  await prisma.examBlueprint.updateMany({
    where: { id: { in: mock.parts.map((p) => p.blueprintId) }, state: { not: "published" } },
    data: { state: "published", publishedAt: now }
  });
  await prisma.mockExam.update({ where: { id }, data: { state: "published", publishedAt: now } });
  refreshAdmin(id);
}

export async function unpublishMockAction(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.mockExam.update({ where: { id }, data: { state: "draft", publishedAt: null } });
  refreshAdmin(id);
}

export async function deleteMockAction(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.mockExam.delete({ where: { id } });
  revalidatePath("/admin/exam-import");
  redirect("/admin/exam-import");
}

async function createPartAttempt(
  mockAttemptId: string,
  candidateId: string,
  part: { blueprintId: string; module: string; order: number },
  timeLimitMin: number | null
) {
  const startedAt = new Date();
  const deadlineAt = computeDeadline(startedAt, durationSecFor(part.module, timeLimitMin));
  return prisma.blueprintAttempt.create({
    data: {
      blueprintId: part.blueprintId,
      candidateId,
      mockAttemptId,
      partOrder: part.order,
      startedAt,
      deadlineAt,
      status: "in_progress",
      answersJson: {} as Prisma.InputJsonValue
    }
  });
}

export async function startMockAttemptAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const mockExamId = String(formData.get("mockExamId") ?? "");
  if (!mockExamId) redirect("/play");

  const mock = await prisma.mockExam.findUnique({
    where: { id: mockExamId },
    include: { parts: { include: { blueprint: true }, orderBy: { order: "asc" } } }
  });
  if (!mock || mock.state !== "published" || mock.parts.length === 0) redirect("/play");

  const existing = await prisma.mockAttempt.findFirst({
    where: { mockExamId, candidateId: userId, status: "in_progress" }
  });
  if (existing) redirect(`/play/mock/${existing.id}`);

  const attempt = await prisma.mockAttempt.create({
    data: { mockExamId, candidateId: userId, status: "in_progress", currentIndex: 0 }
  });
  const first = mock.parts[0]!;
  await createPartAttempt(attempt.id, userId, first, first.blueprint.timeLimitMin);
  redirect(`/play/mock/${attempt.id}`);
}

export async function submitMockPartAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const mockAttemptId = String(formData.get("mockAttemptId") ?? "");
  const attemptId = String(formData.get("attemptId") ?? "");
  if (!mockAttemptId) redirect("/play");

  const mockAttempt = await prisma.mockAttempt.findUnique({
    where: { id: mockAttemptId },
    include: { mockExam: { include: { parts: { include: { blueprint: true }, orderBy: { order: "asc" } } } } }
  });
  if (!mockAttempt || mockAttempt.candidateId !== userId) redirect("/play");
  if (mockAttempt.status === "submitted") redirect(`/play/mock/${mockAttemptId}/result`);

  const part = await prisma.blueprintAttempt.findUnique({
    where: { id: attemptId },
    include: { blueprint: true }
  });
  if (part && part.mockAttemptId === mockAttemptId && part.status !== "submitted") {
    const answerKey = part.blueprint.answerKeyJson as unknown as Record<string, ImportAnswerKey>;
    const answers = part.answersJson as unknown as Record<string, CandidateAnswer>;
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
  }

  const parts = mockAttempt.mockExam.parts;
  const nextIndex = mockAttempt.currentIndex + 1;
  if (nextIndex < parts.length) {
    const next = parts[nextIndex]!;
    await createPartAttempt(mockAttemptId, userId, next, next.blueprint.timeLimitMin);
    await prisma.mockAttempt.update({
      where: { id: mockAttemptId },
      data: { currentIndex: nextIndex }
    });
    redirect(`/play/mock/${mockAttemptId}`);
  }

  const partAttempts = await prisma.blueprintAttempt.findMany({
    where: { mockAttemptId },
    include: { blueprint: true },
    orderBy: { partOrder: "asc" }
  });
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
  await prisma.mockAttempt.update({
    where: { id: mockAttemptId },
    data: {
      status: "submitted",
      submittedAt: new Date(),
      resultJson: summary as unknown as Prisma.InputJsonValue
    }
  });
  redirect(`/play/mock/${mockAttemptId}/result`);
}
