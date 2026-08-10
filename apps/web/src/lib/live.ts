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
  if (!orgId) return [];
  const rows = await prisma.blueprintAttempt.findMany({
    where: {
      status: "in_progress",
      submittedAt: null,
      blueprint: { orgId }
    },
    include: {
      candidate: { select: { name: true, email: true } },
      blueprint: { select: { title: true, module: true } },
      mockAttempt: { select: { mockExam: { select: { title: true } } } }
    },
    orderBy: { deadlineAt: "asc" }
  });

  const now = Date.now();
  return rows.map((row) => {
    const ageSec = Math.max(0, Math.round((now - row.updatedAt.getTime()) / 1000));
    const connection: LiveConnection =
      ageSec < 45 ? "live" : ageSec < 150 ? "idle" : "offline";
    const remainingSec = remainingSeconds(row.deadlineAt);
    return {
      id: row.id,
      candidate: row.candidate.name ?? row.candidate.email,
      examTitle: row.mockAttempt?.mockExam.title ?? row.blueprint.title,
      sectionKind: row.blueprint.module,
      remainingSec,
      expired: remainingSec <= 0,
      heartbeatAgeSec: ageSec,
      connection
    };
  });
}
