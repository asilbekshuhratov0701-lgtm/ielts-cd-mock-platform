import type { NextAuthConfig } from "next-auth";
import type { Role } from "@ielts/core";

const AUTH_PAGES = ["/login", "/register", "/forgot", "/reset"];
const CANDIDATE_PREFIXES = [
  "/dashboard",
  "/exams",
  "/results",
  "/analytics",
  "/profile",
  "/exam",
  "/notifications"
];
const ADMIN_PREFIX = "/admin";

function roleHome(role: string | undefined): string {
  return role === "CANDIDATE" ? "/dashboard" : "/admin";
}

/**
 * Edge-safe Auth.js config (NO database/native deps) — shared by middleware and the full
 * Node config. Holds session strategy, token/session shaping, and route authorization.
 * The Credentials provider (which needs Prisma + Argon2) is added only in `auth.ts`.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * (Number(process.env.SESSION_MAX_AGE_DAYS) || 7)
  },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        if ("role" in user && user.role) token.role = user.role as Role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const uid = token.uid;
        const role = token.role;
        if (typeof uid === "string") session.user.id = uid;
        if (typeof role === "string") session.user.role = role as Role;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const path = nextUrl.pathname;

      const isAuthPage = AUTH_PAGES.includes(path);
      const isAdminArea = path === ADMIN_PREFIX || path.startsWith(`${ADMIN_PREFIX}/`);
      const isCandidateArea = CANDIDATE_PREFIXES.some(
        (p) => path === p || path.startsWith(`${p}/`)
      );

      // Logged-in users shouldn't see auth pages — bounce to their role home.
      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL(roleHome(role), nextUrl));
        return true;
      }

      if (isAdminArea) {
        if (!isLoggedIn) return false; // → redirect to signIn
        if (role === "CANDIDATE") return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      if (isCandidateArea) {
        if (!isLoggedIn) return false;
        return true;
      }

      return true; // public routes (landing, etc.)
    }
  }
} satisfies NextAuthConfig;
