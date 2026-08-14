"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PauseCircle, ShieldCheck } from "lucide-react";

export function ExamHoldScreen({
  reason,
  examTitle,
  answered,
  totalQuestions
}: {
  reason: "paused" | "interrupted";
  examTitle: string;
  answered: number;
  totalQuestions: number;
}) {
  const router = useRouter();
  const [checkedAt, setCheckedAt] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCheckedAt((n) => n + 1);
      router.refresh();
    }, 10000);
    return () => clearInterval(id);
  }, [router]);

  const title =
    reason === "paused" ? "Your exam is paused" : "Your exam session was interrupted";
  const body =
    reason === "paused"
      ? "An administrator has frozen the clock. No time is being used while you wait."
      : "The time on this section ran out while you were disconnected. An administrator can give you time to continue.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          {reason === "paused" ? (
            <PauseCircle className="h-7 w-7" />
          ) : (
            <ShieldCheck className="h-7 w-7" />
          )}
        </div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{examTitle}</p>
        <p className="mt-4 text-sm text-slate-600">{body}</p>

        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">
            {answered}/{totalQuestions}
          </span>{" "}
          answers saved
        </div>

        <p className="mt-5 text-xs text-slate-400">
          Keep this window open — it resumes automatically once permission is granted.
          {checkedAt > 0 ? " Checked just now." : ""}
        </p>
      </div>
    </div>
  );
}
