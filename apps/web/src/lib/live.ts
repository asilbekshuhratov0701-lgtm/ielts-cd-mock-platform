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
  heartbeatAgeSec: number | null;
  connection: LiveConnection;
};

export async function listLiveSessions(orgId: string): Promise<LiveSession[]> {
  const rows = await prisma.sectionAttempt.findMany({
    where: {
      submittedAt: null,
      deadlineAt: { not: null },
      attempt: { status: "IN_PROGRESS", exam: { orgId } }
    },
    include: {
      section: true,
      attempt: { include: { candidate: true, exam: true } }
    },
    orderBy: { deadlineAt: "asc" }
  });

  const now = Date.now();
  return rows.map((row) => {
    const ageSec = row.lastHeartbeatAt
      ? Math.round((now - row.lastHeartbeatAt.getTime()) / 1000)
      : null;
    const connection: LiveConnection =
      ageSec == null ? "unknown" : ageSec < 30 ? "live" : ageSec < 90 ? "idle" : "offline";
    const remainingSec = row.deadlineAt ? remainingSeconds(row.deadlineAt) : 0;
    return {
      id: row.id,
      candidate: row.attempt.candidate.name ?? row.attempt.candidate.email,
      examTitle: row.attempt.exam.title,
      sectionKind: row.section.kind,
      remainingSec,
      expired: remainingSec <= 0,
      heartbeatAgeSec: ageSec,
      connection
    };
  });
}
