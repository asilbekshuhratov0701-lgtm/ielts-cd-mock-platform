import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hero-grid px-4 py-10 [background-size:24px_24px]">
      <Logo className="mb-6 text-lg" />
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-card">
        {children}
      </div>
      <p className="mt-6 text-xs text-muted">Computer-Delivered IELTS mock platform</p>
    </div>
  );
}
