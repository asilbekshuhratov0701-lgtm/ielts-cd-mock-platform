import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { auth } from "@/auth";
import { ExamError, loadRunnerState } from "@/lib/exam";
import { ExamRunner } from "@/components/exam/ExamRunner";
import { Button } from "@/components/ui/button";

export default async function ExamRunnerPage({
  params
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let state;
  try {
    state = await loadRunnerState(attemptId, session.user.id);
  } catch (error) {
    if (error instanceof ExamError && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")) {
      notFound();
    }
    throw error;
  }

  if (state.status !== "IN_PROGRESS" || !state.current) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-20">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Exam submitted
          </h1>
          <p className="mt-2 text-sm text-muted">
            Your responses for <strong className="text-foreground">{state.examTitle}</strong> have
            been recorded. Listening and Reading are scored automatically; Writing is marked by an
            examiner.
          </p>
          <Link href="/results" className="mt-6 inline-block">
            <Button size="lg">View results</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <ExamRunner key={state.current.sectionId} initial={state} />;
}
