"use server";

import { randomBytes, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import { forgotPasswordSchema, resetPasswordSchema } from "@ielts/validators";
import { hashPassword } from "@/lib/password";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import type { ResetFormState } from "@/lib/auth-types";

const TOKEN_TTL_MS = 1000 * 60 * 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function forgotPasswordAction(
  _prev: ResetFormState,
  formData: FormData
): Promise<ResetFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const email = parsed.data.email.toLowerCase();
  const generic: ResetFormState = {
    success: "If that email is registered, a reset link is on its way."
  };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status === "SUSPENDED" || user.status === "DELETED" || !user.passwordHash) {
    return generic;
  }

  const rawToken = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(rawToken), expires }
  });

  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const link = `${base}/reset?token=${rawToken}`;
  const mail = passwordResetEmail(link);
  await sendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text });

  await logAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: "auth.password_reset_requested",
    entity: "User",
    entityId: user.id
  });

  return generic;
}

export async function resetPasswordAction(
  _prev: ResetFormState,
  formData: FormData
): Promise<ResetFormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const parsed = resetPasswordSchema.safeParse({ token, password });
  if (!parsed.success) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });
  if (!record || record.usedAt || record.expires < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })
  ]);

  await logAudit({
    orgId: record.user.orgId,
    actorId: record.userId,
    action: "auth.password_reset",
    entity: "User",
    entityId: record.userId
  });

  redirect("/login?reset=1");
}
