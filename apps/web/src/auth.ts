import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@ielts/db";
import { loginSchema } from "@ielts/validators";
import type { Role } from "@ielts/core";
import { authConfig } from "./auth.config";
import { verifyPassword } from "@/lib/password";

/**
 * Full (Node-runtime) Auth.js instance — adds the Credentials provider that needs Prisma
 * and Argon2. Used by the API route handler and server actions. Middleware uses the
 * edge-safe `authConfig` instead.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || user.status === "SUSPENDED" || user.status === "DELETED") {
          return null;
        }

        const ok = await verifyPassword(user.passwordHash, password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role as Role
        };
      }
    })
  ]
});
