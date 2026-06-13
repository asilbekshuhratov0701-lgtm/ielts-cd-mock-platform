"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { startAttempt } from "@/lib/exam";

export async function startAttemptAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const examId = String(formData.get("examId") ?? "");
  if (!examId) redirect("/exams");

  const attemptId = await startAttempt(session.user.id, examId);
  redirect(`/exam/${attemptId}`);
}
