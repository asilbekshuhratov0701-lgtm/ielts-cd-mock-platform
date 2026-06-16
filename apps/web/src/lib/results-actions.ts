"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";

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
    select: { exam: { select: { orgId: true } } }
  });
  if (!attempt || attempt.exam.orgId !== staff.orgId) return;

  await prisma.score.updateMany({
    where: { attemptId },
    data: { publishedAt: released ? new Date() : null }
  });

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
