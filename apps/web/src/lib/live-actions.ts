"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import { remainingSeconds } from "@ielts/core";
import { auth } from "@/auth";

const MAX_GRANT_MINUTES = 180;

async function requireAdminOrgId(): Promise<string | null> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) return null;
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  return me?.orgId ?? null;
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
