"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { createResultReleasedNotification } from "@/lib/notifications";

const SCORED_STATUSES = ["SUBMITTED", "GRADED", "PUBLISHED"] as const;

async function requireStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || role === "CANDIDATE") redirect("/admin");
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser) redirect("/admin");
  return dbUser;
}

async function setReleased(attemptId: string, released: boolean): Promise<void> {
  const staff = await requireStaff();
  if (!attemptId) return;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { candidateId: true, exam: { select: { orgId: true, title: true } } }
  });
  if (!attempt || attempt.exam.orgId !== staff.orgId) return;

  await prisma.score.updateMany({
    where: { attemptId },
    data: { publishedAt: released ? new Date() : null }
  });

  if (released) {
    await createResultReleasedNotification(attempt.candidateId, {
      attemptId,
      examTitle: attempt.exam.title
    });
  }

  await logAudit({
    orgId: attempt.exam.orgId,
    actorId: staff.id,
    action: released ? "result.release" : "result.hold",
    entity: "attempt",
    entityId: attemptId
  });
  revalidatePath("/admin/results");
}

export async function releaseResultAction(formData: FormData): Promise<void> {
  await setReleased(String(formData.get("attemptId") ?? ""), true);
}

export async function holdResultAction(formData: FormData): Promise<void> {
  await setReleased(String(formData.get("attemptId") ?? ""), false);
}

export async function releaseAllHeldAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const examId = String(formData.get("examId") ?? "");

  const held = await prisma.attempt.findMany({
    where: {
      exam: { orgId: staff.orgId },
      status: { in: [...SCORED_STATUSES] },
      score: { is: { publishedAt: null } },
      ...(examId ? { examId } : {})
    },
    select: { id: true, candidateId: true, exam: { select: { title: true } } }
  });
  if (held.length === 0) return;

  const attemptIds = held.map((a) => a.id);
  await prisma.score.updateMany({
    where: { attemptId: { in: attemptIds } },
    data: { publishedAt: new Date() }
  });

  await Promise.all(
    held.map((a) =>
      createResultReleasedNotification(a.candidateId, {
        attemptId: a.id,
        examTitle: a.exam.title
      })
    )
  );

  await logAudit({
    orgId: staff.orgId,
    actorId: staff.id,
    action: "result.release.bulk",
    meta: { count: attemptIds.length, exam: examId || "all" }
  });
  revalidatePath("/admin/results");
}
