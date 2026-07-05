import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import {
  archiveExamAction,
  createExamAction,
  deleteExamAction,
  publishExamAction
} from "@/lib/admin-exam-actions";
import { MockAssignmentForm } from "@/components/exam-import/MockAssignmentForm";

export const metadata = { title: "Exams" };

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-foreground/10 text-foreground/60"
};

export default async function AdminExamsPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const exams = user
    ? await prisma.exam.findMany({
        where: { orgId: user.orgId },
        include: { _count: { select: { sections: true, attempts: true } } },
        orderBy: { createdAt: "desc" }
      })
    : [];
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
    <PageShell title="Exams" subtitle="Create, author, publish and archive exams.">
      <form
        action={createExamAction}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-100 p-4"
      >
        <label className="text-xs text-foreground/60">
          New exam title
          <input
            name="title"
            required
            placeholder="IELTS Academic Mock 2"
            className="mt-1 block w-64 rounded-lg border border-brand-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-foreground/60">
          Module
          <select
            name="moduleType"
            className="mt-1 block rounded-lg border border-brand-200 px-3 py-2 text-sm"
          >
            <option value="ACADEMIC">Academic</option>
            <option value="GENERAL">General Training</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Create exam
        </button>
      </form>

      {exams.length === 0 ? (
        <p className="text-sm text-foreground/60">No exams yet.</p>
      ) : (
        <ul className="space-y-2">
          {exams.map((exam) => (
            <li
              key={exam.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 p-4"
            >
              <div>
                <p className="font-medium text-brand-700">{exam.title}</p>
                <p className="text-xs text-foreground/60">
                  {exam.moduleType} · {exam._count.sections} sections · {exam._count.attempts}{" "}
                  attempts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${STATUS_STYLE[exam.status] ?? ""}`}
                >
                  {exam.status}
                </span>
                <Link
                  href={`/admin/exams/${exam.id}/edit`}
                  className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50"
                >
                  Edit
                </Link>
                {exam.status !== "PUBLISHED" ? (
                  <form action={publishExamAction}>
                    <input type="hidden" name="examId" value={exam.id} />
                    <button className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700">
                      Publish
                    </button>
                  </form>
                ) : (
                  <form action={archiveExamAction}>
                    <input type="hidden" name="examId" value={exam.id} />
                    <button className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm text-foreground/70 hover:bg-brand-50">
                      Archive
                    </button>
                  </form>
                )}
                <form action={deleteExamAction}>
                  <input type="hidden" name="examId" value={exam.id} />
                  <button className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Full mocks (JSON import)
        </h2>
        {mocks.length === 0 ? (
          <p className="text-sm text-foreground/60">
            No published mocks yet. Build one under{" "}
            <Link href="/admin/exam-import" className="text-brand-600 hover:underline">
              Exam Import (JSON)
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
      </div>
    </PageShell>
  );
}
