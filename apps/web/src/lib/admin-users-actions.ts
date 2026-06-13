"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { hashPassword } from "@/lib/password";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "EXAMINER"] as const;
const ALL_ROLES = ["SUPER_ADMIN", "ADMIN", "EXAMINER", "CANDIDATE"] as const;

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) redirect("/admin");
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser) redirect("/admin");
  return dbUser;
}

const createUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

export async function createCandidateAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) return;

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) redirect("/admin/candidates?error=email");

  await prisma.user.create({
    data: {
      orgId: admin.orgId,
      name: parsed.data.name,
      email: parsed.data.email,
      role: "CANDIDATE",
      status: "ACTIVE",
      passwordHash: await hashPassword(parsed.data.password),
      candidateProfile: { create: {} }
    }
  });
  revalidatePath("/admin/candidates");
}

export async function createStaffAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const roleRaw = String(formData.get("role") ?? "EXAMINER");
  const role = (STAFF_ROLES as readonly string[]).includes(roleRaw) ? roleRaw : "EXAMINER";
  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) return;

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) redirect("/admin/users?error=email");

  await prisma.user.create({
    data: {
      orgId: admin.orgId,
      name: parsed.data.name,
      email: parsed.data.email,
      role: role as (typeof STAFF_ROLES)[number],
      status: "ACTIVE",
      passwordHash: await hashPassword(parsed.data.password),
      staffProfile: { create: {} }
    }
  });
  revalidatePath("/admin/users");
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId || password.length < 8) return;
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) }
  });
  revalidatePath("/admin/candidates");
  revalidatePath("/admin/users");
}

export async function changeRoleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const roleRaw = String(formData.get("role") ?? "");
  if (!userId || userId === admin.id) return;
  if (!(ALL_ROLES as readonly string[]).includes(roleRaw)) return;
  await prisma.user.update({
    where: { id: userId },
    data: { role: roleRaw as (typeof ALL_ROLES)[number] }
  });
  revalidatePath("/admin/users");
}

export async function setStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!userId || userId === admin.id) return;
  if (status !== "ACTIVE" && status !== "SUSPENDED") return;
  await prisma.user.update({ where: { id: userId }, data: { status } });
  revalidatePath("/admin/users");
  revalidatePath("/admin/candidates");
}

export async function assignExamAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const candidateId = String(formData.get("candidateId") ?? "");
  const examId = String(formData.get("examId") ?? "");
  if (!candidateId || !examId) return;

  const existing = await prisma.examAssignment.findFirst({
    where: { candidateId, examId, targetType: "CANDIDATE" }
  });
  if (!existing) {
    await prisma.examAssignment.create({
      data: { examId, candidateId, targetType: "CANDIDATE", status: "ACTIVE", maxAttempts: 1 }
    });
  }
  revalidatePath("/admin/candidates");
}
