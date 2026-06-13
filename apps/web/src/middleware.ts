import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge middleware: decodes the JWT session and applies the `authorized` callback
// (route protection + role-based redirects) from the edge-safe auth config.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything except API routes, Next internals, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
