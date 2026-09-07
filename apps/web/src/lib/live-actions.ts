"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, Prisma } from "@ielts/db";
import {
  remainingSeconds,
  scoreImportedExam,
  type CandidateAnswer,
  type ImportAnswerKey
} from "@ielts/core";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";

const MAX_GRANT_MINUTES = 180;

async function requireAdmin(): Promise<{ id: string; orgId: string } | null> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) return null;
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  return me?.orgId ? { id: me.id, orgId: me.orgId } : null;
}

async function requireAdminOrgId(): Promise<string | null> {
  return (await requireAdmin())?.orgId ?? null;
}

async function loadOwnedAttempt(attemptId: string, orgId: string) {
  return prisma.blueprintAttempt.findFirst({
    where: { id: attemptId, status: "in_progress", blueprint: { orgId } }
  });
}

function minutesFrom(formData: FormData, field: string): number {
  const raw = Number(String(formData.get(field) ?? "").trim());
  if (!Number.isFinite(raw)) return 0;
  return Math.min(MAX_GRANT_MINUTES, Math.max(0, Math.round(raw)));
}

export async function pauseAttemptAction(formData: FormData): Promise<void> {
  const orgId = await requireAdminOrgId();
  if (!orgId) return;
  const attemptId = String(formData.get("attemptId") ?? "");
  if (!attemptId) return;
  const attempt = await loadOwnedAttempt(attemptId, orgId);
  if (!attempt || attempt.pausedAt) return;

  await prisma.blueprintAttempt.update({
    where: { id: attemptId },
    data: {
      pausedAt: new Date(),
      pausedRemainingSec: Math.max(0, remainingSeconds(attempt.deadlineAt))
    }
  });
  revalidatePath("/admin/live");
  redirect("/admin/live?notice=attempt_paused");
}

export async function resumeAttemptAction(formData: FormData): Promise<void> {
  const orgId = await requireAdminOrgId();
  if (!orgId) return;
  const attemptId = String(formData.get("attemptId") ?? "");
  if (!attemptId) return;
  const attempt = await loadOwnedAttempt(attemptId, orgId);
  if (!attempt) return;

  const extraSec = minutesFrom(formData, "extraMinutes") * 60;
  const base = attempt.pausedAt
    ? (attempt.pausedRemainingSec ?? 0)
    : Math.max(0, remainingSeconds(attempt.deadlineAt));
  const seconds = base + extraSec;

  await prisma.blueprintAttempt.update({
    where: { id: attemptId },
    data: {
      pausedAt: null,
      pausedRemainingSec: null,
      deadlineAt: new Date(Date.now() + seconds * 1000),
      grantedExtraSec: attempt.grantedExtraSec + extraSec
    }
  });
  revalidatePath("/admin/live");
  redirect("/admin/live?notice=attempt_resumed");
}

export async function grantTimeAction(formData: FormData): Promise<void> {
  const orgId = await requireAdminOrgId();
  if (!orgId) return;
  const attemptId = String(formData.get("attemptId") ?? "");
  if (!attemptId) return;
  const attempt = await loadOwnedAttempt(attemptId, orgId);
  if (!attempt) return;

  const extraSec = minutesFrom(formData, "extraMinutes") * 60;
  if (extraSec <= 0) return;

  if (attempt.pausedAt) {
    await prisma.blueprintAttempt.update({
      where: { id: attemptId },
      data: {
        pausedRemainingSec: (attempt.pausedRemainingSec ?? 0) + extraSec,
        grantedExtraSec: attempt.grantedExtraSec + extraSec
      }
    });
  } else {
    const base = Math.max(0, remainingSeconds(attempt.deadlineAt));
    await prisma.blueprintAttempt.update({
      where: { id: attemptId },
      data: {
        deadlineAt: new Date(Date.now() + (base + extraSec) * 1000),
        grantedExtraSec: attempt.grantedExtraSec + extraSec
      }
    });
  }
  revalidatePath("/admin/live");
  redirect("/admin/live?notice=time_granted");
}

async function scoreAndSubmit(
  attempt: { id: string; answersJson: unknown; blueprint: { answerKeyJson: unknown } },
  now: Date
): Promise<void> {
  const answerKey = attempt.blueprint.answerKeyJson as unknown as Record<string, ImportAnswerKey>;
  const answers = attempt.answersJson as unknown as Record<string, CandidateAnswer>;
  const score = scoreImportedExam(answerKey, answers);
  await prisma.blueprintAttempt.updateMany({
    where: { id: attempt.id, status: "in_progress" },
    data: {
      status: "submitted",
      submittedAt: now,
      pausedAt: null,
      pausedRemainingSec: null,
      rawScore: score.correct,
      totalScore: score.total,
      resultJson: score as unknown as Prisma.InputJsonValue
    }
  });
}

export async function endAttemptAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;
  const attemptId = String(formData.get("attemptId") ?? "");
  if (!attemptId) return;
  const attempt = await prisma.blueprintAttempt.findFirst({
    where: { id: attemptId, status: "in_progress", blueprint: { orgId: admin.orgId } },
    include: { blueprint: { select: { answerKeyJson: true } } }
  });
  if (!attempt) return;

  const now = new Date();
  await scoreAndSubmit(attempt, now);

  const mockAttemptId = attempt.mockAttemptId;
  if (mockAttemptId) {
    const openParts = await prisma.blueprintAttempt.findMany({
      where: { mockAttemptId, status: "in_progress" },
      include: { blueprint: { select: { answerKeyJson: true } } }
    });
    for (const part of openParts) await scoreAndSubmit(part, now);

    const partAttempts = await prisma.blueprintAttempt.findMany({
      where: { mockAttemptId },
      include: { blueprint: { select: { module: true, title: true } } },
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
    await prisma.mockAttempt.updateMany({
      where: { id: mockAttemptId, status: "in_progress" },
      data: {
        status: "submitted",
        submittedAt: now,
        resultJson: summary as unknown as Prisma.InputJsonValue
      }
    });
  }

  await logAudit({
    orgId: admin.orgId,
    actorId: admin.id,
    action: "live.attempt.end",
    entity: "attempt",
    entityId: attemptId,
    meta: { mockAttemptId, candidateId: attempt.candidateId }
  });

  revalidatePath("/admin/live");
  redirect("/admin/live?notice=attempt_ended");
}

export async function discardAttemptAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;
  const attemptId = String(formData.get("attemptId") ?? "");
  if (!attemptId) return;
  const attempt = await prisma.blueprintAttempt.findFirst({
    where: { id: attemptId, status: "in_progress", blueprint: { orgId: admin.orgId } },
    select: { id: true, candidateId: true, mockAttemptId: true }
  });
  if (!attempt) return;

  const mockAttemptId = attempt.mockAttemptId;
  if (mockAttemptId) {
    await prisma.$transaction([
      prisma.blueprintAttempt.deleteMany({ where: { mockAttemptId } }),
      prisma.mockAttempt.deleteMany({ where: { id: mockAttemptId } })
    ]);
  } else {
    await prisma.blueprintAttempt.deleteMany({ where: { id: attempt.id } });
  }

  await logAudit({
    orgId: admin.orgId,
    actorId: admin.id,
    action: "live.attempt.discard",
    entity: "attempt",
    entityId: attemptId,
    meta: { mockAttemptId, candidateId: attempt.candidateId }
  });

  revalidatePath("/admin/live");
  redirect("/admin/live?notice=attempt_discarded");
}
