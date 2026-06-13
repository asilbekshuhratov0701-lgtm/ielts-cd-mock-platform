import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { startAttemptAction } from "@/lib/exam-actions";
import { PageShell } from "@/components/Shell";

export const metadata = { title: "Exams" };

export default async function ExamsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const exams = user
    ? await prisma.exam.findMany({
        where: { orgId: user.orgId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        include: { sections: { orderBy: { order: "asc" } } }
      })
    : [];

  const inProgress = await prisma.attempt.findMany({
    where: { candidateId: session.user.id, status: "IN_PROGRESS" },
    select: { id: true, examId: true }
  });
  const resumeByExam = new Map(inProgress.map((a) => [a.examId, a.id]));

  return (
    <PageShell title="My Exams" subtitle="Available mock exams. Start a new attempt or resume.">
      {exams.length === 0 ? (
        <p className="text-sm text-foreground/60">No published exams yet.</p>
      ) : (
        <ul className="space-y-3">
          {exams.map((exam) => {
            const resumeId = resumeByExam.get(exam.id);
            const minutes = Math.round(
              exam.sections.reduce((sum, s) => sum + s.durationSec, 0) / 60
            );
            return (
              <li
                key={exam.id}
                className="flex items-center justify-between rounded-xl border border-brand-100 p-4"
              >
                <div>
                  <p className="font-medium text-brand-700">{exam.title}</p>
                  <p className="text-sm text-foreground/60">
                    {exam.moduleType} · {exam.sections.map((s) => s.kind).join(" → ")} · ~{minutes}{" "}
                    min
                  </p>
                </div>
                <form action={startAttemptAction}>
                  <input type="hidden" name="examId" value={exam.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    {resumeId ? "Resume" : "Start"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
