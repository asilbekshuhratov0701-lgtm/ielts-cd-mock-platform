"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { importExamFromPdf } from "@/lib/ai-import";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) redirect("/admin");
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser) redirect("/admin");
  return dbUser;
}

export async function importExamAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/admin/imports?error=nofile");
  if (!file.name.toLowerCase().endsWith(".pdf")) redirect("/admin/imports?error=notpdf");

  const data = new Uint8Array(await file.arrayBuffer());

  let examId: string;
  try {
    const result = await importExamFromPdf({
      orgId: admin.orgId,
      createdById: admin.id,
      filename: file.name,
      data
    });
    examId = result.examId;
  } catch {
    redirect("/admin/imports?error=failed");
  }

  redirect(`/admin/exams/${examId}/edit`);
}

export async function deleteImportAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;
  await prisma.importJob.delete({ where: { id: jobId } });
  revalidatePath("/admin/imports");
}
