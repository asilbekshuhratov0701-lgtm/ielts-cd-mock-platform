"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { publishResult, saveEvaluation } from "@/lib/writing-eval";
import { logAudit } from "@/lib/audit";

const criteriaSchema = z.object({
  taskResponse: z.coerce.number().min(0).max(9),
  coherenceCohesion: z.coerce.number().min(0).max(9),
  lexicalResource: z.coerce.number().min(0).max(9),
  grammaticalRange: z.coerce.number().min(0).max(9)
});

async function requireStaff() {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "CANDIDATE") redirect("/login");
  return session.user;
}

export async function saveEvaluationAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const attemptId = String(formData.get("attemptId") ?? "");
  const taskNo = Number(formData.get("taskNo") ?? 0);

  const parsed = criteriaSchema.safeParse({
    taskResponse: formData.get("taskResponse"),
    coherenceCohesion: formData.get("coherenceCohesion"),
    lexicalResource: formData.get("lexicalResource"),
    grammaticalRange: formData.get("grammaticalRange")
  });
  if (!attemptId || !taskNo || !parsed.success) return;

  const feedback = String(formData.get("feedback") ?? "").trim();
  await saveEvaluation(attemptId, taskNo, user.id, parsed.data, feedback || undefined);
  revalidatePath(`/admin/writing/${attemptId}`);
}

export async function publishResultAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const attemptId = String(formData.get("attemptId") ?? "");
  if (!attemptId) return;
  await publishResult(attemptId);
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { exam: { select: { orgId: true } } }
  });
  if (attempt) {
    await logAudit({
      orgId: attempt.exam.orgId,
      actorId: user.id,
      action: "result.publish",
      entity: "attempt",
      entityId: attemptId
    });
  }
  redirect("/admin/writing");
}
