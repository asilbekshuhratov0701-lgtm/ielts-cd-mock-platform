import { prisma } from "@ielts/db";
import { remainingSeconds } from "@ielts/core";

export type LiveConnection = "live" | "idle" | "offline" | "unknown";

export type LiveSession = {
  id: string;
  candidate: string;
  examTitle: string;
  sectionKind: string;
  remainingSec: number;
  expired: boolean;
  paused: boolean;
  heartbeatAgeSec: number | null;
  connection: LiveConnection;
  answered: number;
  totalQuestions: number;
  grantedExtraSec: number;
  needsAttention: boolean;
};

export function answeredCount(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  let n = 0;
  for (const answer of Object.values(value as Record<string, unknown>)) {
    if (answer === null || answer === undefined) continue;
    if (Array.isArray(answer)) {
      if (answer.length > 0) n += 1;
    } else if (String(answer).trim() !== "") {
      n += 1;
    }
  }
  return n;
}

export type HoldReason = "paused" | "interrupted";

export function holdReason(attempt: {
  pausedAt: Date | null;
  deadlineAt: Date;
}): HoldReason | null {
  if (attempt.pausedAt) return "paused";
  if (remainingSeconds(attempt.deadlineAt) <= 0) return "interrupted";
  return null;
}

export function sessionRemainingSec(attempt: {
  deadlineAt: Date;
  pausedAt: Date | null;
  pausedRemainingSec: number | null;
}): number {
  if (attempt.pausedAt) return Math.max(0, attempt.pausedRemainingSec ?? 0);
  return remainingSeconds(attempt.deadlineAt);
}

export async function listLiveSessions(orgId: string): Promise<LiveSession[]> {
  if (!orgId) return [];
  const rows = await prisma.blueprintAttempt.findMany({
    where: {
      status: "in_progress",
      submittedAt: null,
      blueprint: { orgId }
    },
    include: {
      candidate: { select: { name: true, email: true } },
      blueprint: { select: { title: true, module: true, totalQuestions: true } },
      mockAttempt: { select: { mockExam: { select: { title: true } } } }
    },
    orderBy: { deadlineAt: "asc" }
  });

  const now = Date.now();
  return rows.map((row) => {
    const ageSec = Math.max(0, Math.round((now - row.updatedAt.getTime()) / 1000));
    const paused = row.pausedAt !== null;
    const connection: LiveConnection = paused
      ? "unknown"
      : ageSec < 45
        ? "live"
        : ageSec < 150
          ? "idle"
          : "offline";
    const remainingSec = sessionRemainingSec(row);
    const expired = !paused && remainingSec <= 0;
    return {
      id: row.id,
      candidate: row.candidate.name ?? row.candidate.email,
      examTitle: row.mockAttempt?.mockExam.title ?? row.blueprint.title,
      sectionKind: row.blueprint.module,
      remainingSec,
      expired,
      paused,
      heartbeatAgeSec: ageSec,
      connection,
      answered: answeredCount(row.answersJson),
      totalQuestions: row.blueprint.totalQuestions,
      grantedExtraSec: row.grantedExtraSec,
      needsAttention: paused || expired || connection === "offline"
    };
  });
}
