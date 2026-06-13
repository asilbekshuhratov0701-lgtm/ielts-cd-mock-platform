import type { Role } from "@ielts/core";
import type { DefaultSession } from "next-auth";

// Augment Auth.js types so `role` and `id` flow through the session and JWT.
declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
  }
}
