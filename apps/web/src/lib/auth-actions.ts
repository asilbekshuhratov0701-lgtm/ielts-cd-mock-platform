"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@ielts/db";
import { registerSchema } from "@ielts/validators";
import { auth, signIn, signOut } from "@/auth";
import { hashPassword } from "@/lib/password";
import type { AuthFormState } from "@/lib/auth-types";

/** Single default organization for now (multi-center is a later flag). */
async function getOrCreateDefaultOrg() {
  return prisma.organization.upsert({
    where: { slug: "default" },
    update: {},
    create: { name: "Default Center", slug: "default" }
  });
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const org = await getOrCreateDefaultOrg();
  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "CANDIDATE",
      orgId: org.id,
      candidateProfile: { create: {} }
    }
  });

  // Auto-login the new candidate, then send to the dashboard.
  await signIn("credentials", { email, password, redirect: false });
  redirect("/dashboard");
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password." };
    throw error;
  }

  const session = await auth();
  redirect(session?.user?.role === "CANDIDATE" ? "/dashboard" : "/admin");
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
