import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { MockAssignmentForm } from "@/components/exam-import/MockAssignmentForm";

export const metadata = { title: "Exams" };

export default async function AdminExamsPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const mocks = user
    ? await prisma.mockExam.findMany({
        where: { orgId: user.orgId, state: "published" },
        include: {
          parts: {
            include: { blueprint: { select: { module: true, totalQuestions: true } } },
            orderBy: { order: "asc" }
          },
          assignments: true
        },
        orderBy: { publishedAt: "desc" }
      })
    : [];
  const candidates = user
    ? await prisma.user.findMany({
        where: { orgId: user.orgId, role: "CANDIDATE" },
        orderBy: { email: "asc" },
        select: { id: true, name: true, email: true }
      })
    : [];
  const groups = user
    ? await prisma.candidateGroup.findMany({
        where: { orgId: user.orgId },
        orderBy: { name: "asc" },
        select: { id: true, name: true }
      })
    : [];

  return (
    <PageShell
      title="Exams"
      subtitle="Published mock exams. Assign them to candidates and groups; build new ones in the Exam Builder."
    >
      {mocks.length === 0 ? (
        <p className="text-sm text-foreground/60">
          No published exams yet. Build one under{" "}
          <Link href="/admin/exam-import" className="text-brand-600 hover:underline">
            Exam Builder
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-2">
          {mocks.map((mock) => {
            const assignedCandidateIds = new Set(
              mock.assignments.map((a) => a.candidateId).filter((v): v is string => Boolean(v))
            );
            const assignedGroupIds = new Set(
              mock.assignments.map((a) => a.groupId).filter((v): v is string => Boolean(v))
            );
            const totalQuestions = mock.parts.reduce(
              (s, p) => s + (p.blueprint.totalQuestions ?? 0),
              0
            );
            const assignedLabel =
              assignedCandidateIds.size + assignedGroupIds.size === 0
                ? "not assigned"
                : `${assignedCandidateIds.size} candidate(s), ${assignedGroupIds.size} group(s)`;
            return (
              <li key={mock.id} className="rounded-xl border border-brand-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-brand-700">{mock.title}</p>
                    <p className="text-xs text-foreground/60">
                      {mock.parts.map((p) => p.module).join(" · ")} · {totalQuestions} questions ·{" "}
                      {assignedLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      PUBLISHED
                    </span>
                    <Link
                      href={`/admin/exam-import/mock/${mock.id}`}
                      className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-brand-600">
                    Assign to candidates &amp; groups
                  </summary>
                  <div className="mt-3">
                    <MockAssignmentForm
                      mockId={mock.id}
                      candidates={candidates}
                      groups={groups}
                      assignedCandidateIds={assignedCandidateIds}
                      assignedGroupIds={assignedGroupIds}
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
