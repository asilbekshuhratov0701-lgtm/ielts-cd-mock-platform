"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "EXAMINER"] as const;
const ALL_ROLES = ["SUPER_ADMIN", "ADMIN", "EXAMINER", "CANDIDATE"] as const;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (
    !dbUser ||
    dbUser.status !== "ACTIVE" ||
    (dbUser.role !== "ADMIN" && dbUser.role !== "SUPER_ADMIN")
  ) {
    redirect("/login");
  }
  return dbUser;
}

const createUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().trim().toLowerCase().pipe(z.string().email()),
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

  const created = await prisma.user.create({
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
  await logAudit({
    orgId: admin.orgId,
    actorId: admin.id,
    action: "candidate.create",
    entity: "user",
    entityId: created.id,
    meta: { email: parsed.data.email }
  });
  revalidatePath("/admin/candidates");
}

export async function createStaffAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const roleRaw = String(formData.get("role") ?? "EXAMINER");
  const role = (STAFF_ROLES as readonly string[]).includes(roleRaw) ? roleRaw : "EXAMINER";
  if (role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") redirect("/admin/users?error=role");
  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) return;

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) redirect("/admin/users?error=email");

  const created = await prisma.user.create({
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
  await logAudit({
    orgId: admin.orgId,
    actorId: admin.id,
    action: "staff.create",
    entity: "user",
    entityId: created.id,
    meta: { email: parsed.data.email, role }
  });
  revalidatePath("/admin/users");
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId || password.length < 8) return;
  const target = await prisma.user.findFirst({ where: { id: userId, orgId: admin.orgId } });
  if (!target) return;
  if (target.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") return;
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash: await hashPassword(password) }
  });
  await logAudit({
    orgId: admin.orgId,
    actorId: admin.id,
    action: "user.password_reset",
    entity: "user",
    entityId: target.id,
    meta: {}
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
  const target = await prisma.user.findFirst({ where: { id: userId, orgId: admin.orgId } });
  if (!target) return;
  if ((roleRaw === "SUPER_ADMIN" || target.role === "SUPER_ADMIN") && admin.role !== "SUPER_ADMIN") {
    return;
  }
  await prisma.user.update({
    where: { id: target.id },
    data: { role: roleRaw as (typeof ALL_ROLES)[number] }
  });
  await logAudit({
    orgId: admin.orgId,
    actorId: admin.id,
    action: "user.role_change",
    entity: "user",
    entityId: target.id,
    meta: { role: roleRaw }
  });
  revalidatePath("/admin/users");
}

export async function setStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!userId || userId === admin.id) return;
  if (status !== "ACTIVE" && status !== "SUSPENDED") return;
  const target = await prisma.user.findFirst({ where: { id: userId, orgId: admin.orgId } });
  if (!target) return;
  if (target.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") return;
  await prisma.user.update({ where: { id: target.id }, data: { status } });
  await logAudit({
    orgId: admin.orgId,
    actorId: admin.id,
    action: "user.status_change",
    entity: "user",
    entityId: target.id,
    meta: { status }
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin/candidates");
}

export async function assignExamAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const candidateId = String(formData.get("candidateId") ?? "");
  const examId = String(formData.get("examId") ?? "");
  if (!candidateId || !examId) return;

  const candidate = await prisma.user.findFirst({
    where: { id: candidateId, orgId: admin.orgId, role: "CANDIDATE" }
  });
  if (!candidate) return;

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
