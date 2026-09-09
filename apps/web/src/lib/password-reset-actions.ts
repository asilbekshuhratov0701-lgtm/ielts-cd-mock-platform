"use server";

import { randomBytes, randomInt, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import {
  forgotPasswordSchema,
  verifyResetCodeSchema,
  resetPasswordSchema
} from "@ielts/validators";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendEmail, passwordCodeEmail, deliveryMode } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import type { ResetFormState } from "@/lib/auth-types";

const CODE_TTL_MIN = 10;
const CODE_TTL_MS = 1000 * 60 * CODE_TTL_MIN;
const RESEND_COOLDOWN_SEC = 60;
const MAX_ATTEMPTS = 5;

function hashTicket(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function secondsUntilResend(lastSentAt: Date): number {
  const elapsed = Math.floor((Date.now() - lastSentAt.getTime()) / 1000);
  return Math.max(0, RESEND_COOLDOWN_SEC - elapsed);
}

/**
 * Both steps of the forgot form run through one action so the form has a single
 * state to render from — with one action per step, a stale reply from the step
 * the candidate has left can outrank the fresh one.
 */
export async function forgotPasswordAction(
  prev: ResetFormState,
  formData: FormData
): Promise<ResetFormState> {
  return formData.get("intent") === "verify"
    ? verifyCode(prev, formData)
    : requestCode(prev, formData);
}

/**
 * Step one. Always reports the same thing whether or not the address is
 * registered, so the form cannot be used to find out who has an account here.
 */
async function requestCode(_prev: ResetFormState, formData: FormData): Promise<ResetFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { step: "email", error: "Enter a valid email address." };

  const email = parsed.data.email;
  const mode = deliveryMode();
  if (mode === "unconfigured") {
    return {
      step: "email",
      email,
      error:
        "Email delivery is not configured on this server, so no code can be sent. Ask an administrator to set RESEND_API_KEY."
    };
  }

  const sent: ResetFormState = {
    step: "code",
    email,
    cooldownSec: RESEND_COOLDOWN_SEC,
    success: `If ${email} is registered, a 6-digit code is on its way. It expires in ${CODE_TTL_MIN} minutes.`
  };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status === "SUSPENDED" || user.status === "DELETED" || !user.passwordHash) {
    return sent;
  }

  const pending = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null, expires: { gt: new Date() } },
    orderBy: { lastSentAt: "desc" }
  });
  const wait = pending ? secondsUntilResend(pending.lastSentAt) : 0;
  if (wait > 0) return { ...sent, cooldownSec: wait };

  const code = newCode();
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      codeHash: await hashPassword(code),
      expires: new Date(Date.now() + CODE_TTL_MS),
      lastSentAt: new Date()
    }
  });

  if (mode === "console") {
    console.info(`[email] no RESEND_API_KEY — password reset code for ${email} is ${code}`);
  } else {
    const mail = passwordCodeEmail(code, CODE_TTL_MIN);
    await sendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text });
  }

  await logAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: "auth.password_reset_requested",
    entity: "User",
    entityId: user.id
  });

  return sent;
}

/**
 * Step two. A correct code mints a one-time ticket and hands the candidate to
 * /reset, so the code itself never travels again.
 */
async function verifyCode(_prev: ResetFormState, formData: FormData): Promise<ResetFormState> {
  const parsed = verifyResetCodeSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code")
  });
  if (!parsed.success) {
    return {
      step: "code",
      email: String(formData.get("email") ?? ""),
      error: "Enter the 6-digit code from the email."
    };
  }

  const { email, code } = parsed.data;
  const onCodeStep: ResetFormState = { step: "code", email };
  const expired: ResetFormState = {
    step: "email",
    email,
    error: "That code has expired or was already used. Request a new one."
  };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return expired;

  const record = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null, verifiedAt: null, expires: { gt: new Date() } },
    orderBy: { lastSentAt: "desc" }
  });
  if (!record) return expired;

  if (!(await verifyPassword(record.codeHash, code))) {
    const attempts = record.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      return {
        step: "email",
        email,
        error: "Too many incorrect codes. Request a new one to try again."
      };
    }
    await prisma.passwordResetToken.update({ where: { id: record.id }, data: { attempts } });
    const left = MAX_ATTEMPTS - attempts;
    return {
      ...onCodeStep,
      error: `That code is not correct. ${left} ${left === 1 ? "try" : "tries"} left.`
    };
  }

  const ticket = randomBytes(32).toString("base64url");
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, verifiedAt: null, usedAt: null },
    data: { verifiedAt: new Date(), tokenHash: hashTicket(ticket) }
  });
  if (claimed.count === 0) return expired;

  redirect(`/reset?token=${ticket}`);
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
    where: { tokenHash: hashTicket(token) },
    include: { user: true }
  });
  if (!record || !record.verifiedAt || record.usedAt || record.expires < new Date()) {
    return { error: "This reset session is invalid or has expired. Request a new code." };
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
