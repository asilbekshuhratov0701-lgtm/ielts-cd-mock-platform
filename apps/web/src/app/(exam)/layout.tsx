import type { ReactNode } from "react";

/**
 * Exam runner layout — intentionally chrome-free and locked down.
 * The real runner adds: fullscreen, beforeunload guard, blur/visibility logging,
 * server-authoritative countdown header, and copy-paste restrictions (Writing).
 */
export default function ExamLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-surface">{children}</div>;
}
