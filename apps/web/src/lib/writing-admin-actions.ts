"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (
    !dbUser ||
    dbUser.status !== "ACTIVE" ||
    (dbUser.role !== "ADMIN" && dbUser.role !== "SUPER_ADMIN")
  ) {
    redirect("/admin/writing?error=role");
  }
  return dbUser;
}

export async function deleteWritingSubmissionsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const keys = formData
    .getAll("key")
    .map((v) => String(v))
    .filter((v) => v.length > 2);

  const mockIds = keys.filter((k) => k.startsWith("m-")).map((k) => k.slice(2));
  const standaloneIds = keys.filter((k) => k.startsWith("s-")).map((k) => k.slice(2));
  if (mockIds.length === 0 && standaloneIds.length === 0) redirect("/admin/writing");

  const mocks =
    mockIds.length > 0
      ? await prisma.mockAttempt.findMany({
          where: { id: { in: mockIds }, mockExam: { orgId: admin.orgId } },
          select: { id: true, candidateId: true, mockExamId: true }
        })
      : [];

  const standalones =
    standaloneIds.length > 0
      ? await prisma.blueprintAttempt.findMany({
          where: {
            id: { in: standaloneIds },
            mockAttemptId: null,
            blueprint: { orgId: admin.orgId, module: "writing" }
          },
          select: { id: true, candidateId: true, blueprintId: true }
        })
      : [];

  if (mocks.length === 0 && standalones.length === 0) {
    redirect("/admin/writing?error=not_found");
  }

  await prisma.$transaction([
    ...(mocks.length > 0
      ? [prisma.mockAttempt.deleteMany({ where: { id: { in: mocks.map((m) => m.id) } } })]
      : []),
    ...(standalones.length > 0
      ? [
          prisma.blueprintAttempt.deleteMany({
            where: { id: { in: standalones.map((s) => s.id) } }
          })
        ]
      : [])
  ]);

  await logAudit({
    orgId: admin.orgId,
    actorId: admin.id,
    action: "writing.submission.delete",
    entity: "attempt",
    meta: {
      mockAttemptIds: mocks.map((m) => m.id),
      blueprintAttemptIds: standalones.map((s) => s.id),
      count: mocks.length + standalones.length
    }
  });

  revalidatePath("/admin/writing");
  revalidatePath("/admin/exam-import");
  redirect("/admin/writing?notice=writing_deleted");
}
