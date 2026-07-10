"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import type { ProfileFormState } from "@/lib/profile-types";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  return user;
}

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const targetRaw = String(formData.get("targetBand") ?? "").trim();

  if (name.length < 2) return { error: "Please enter your full name." };

  let targetBand: number | null = null;
  if (targetRaw) {
    const parsed = Number(targetRaw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9) {
      return { error: "Target band must be between 0 and 9." };
    }
    targetBand = Math.round(parsed * 2) / 2;
  }

  await prisma.user.update({ where: { id: user.id }, data: { name } });
  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, phone: phone || null, country: country || null, targetBand },
    update: { phone: phone || null, country: country || null, targetBand }
  });

  await logAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: "profile.update",
    entity: "User",
    entityId: user.id
  });

  revalidatePath("/profile");
  return { success: "Profile saved." };
}

export async function changePasswordAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser();

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!user.passwordHash) return { error: "Password change is unavailable for this account." };
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords do not match." };

  const ok = await verifyPassword(user.passwordHash, current);
  if (!ok) return { error: "Current password is incorrect." };

  const passwordHash = await hashPassword(next);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await logAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: "profile.password_change",
    entity: "User",
    entityId: user.id
  });

  return { success: "Password changed." };
}
