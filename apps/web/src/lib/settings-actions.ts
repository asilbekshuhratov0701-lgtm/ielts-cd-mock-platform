"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { SETTING_KEYS, setSetting } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) redirect("/admin");
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser) redirect("/admin");
  return dbUser;
}

export async function saveSettingsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const orgName = String(formData.get("orgName") ?? "").trim();
  const task2Weight = Number(formData.get("task2Weight") ?? 2);
  const passBand = Number(formData.get("passBand") ?? 6.5);

  if (orgName) {
    await prisma.organization.update({ where: { id: admin.orgId }, data: { name: orgName } });
  }
  if (Number.isFinite(task2Weight) && task2Weight > 0) {
    await setSetting(admin.orgId, SETTING_KEYS.task2Weight, task2Weight);
  }
  if (Number.isFinite(passBand) && passBand >= 0 && passBand <= 9) {
    await setSetting(admin.orgId, SETTING_KEYS.passBand, passBand);
  }

  await logAudit({
    orgId: admin.orgId,
    actorId: admin.id,
    action: "settings.update",
    meta: { orgName, task2Weight, passBand }
  });
  revalidatePath("/admin/settings");
}
