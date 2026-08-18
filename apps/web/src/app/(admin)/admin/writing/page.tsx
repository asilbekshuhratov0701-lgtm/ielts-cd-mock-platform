import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import {
  WritingEvaluationTable,
  type WritingRowData
} from "@/components/admin/WritingEvaluationTable";

export const metadata = { title: "Writing Evaluation" };
export const dynamic = "force-dynamic";

interface WritingRow extends WritingRowData {
  submitted: Date | null;
}

export default async function AdminWritingPage() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;

  if (!me) {
    return (
      <PageShell title="Writing Evaluation" subtitle="Score submitted Writing tasks.">
        <Card className="p-8 text-center text-sm text-muted">Sign in to continue.</Card>
      </PageShell>
    );
  }

  const mockWriting = await prisma.mockAttempt.findMany({
    where: {
      status: "submitted",
      mockExam: { orgId: me.orgId, parts: { some: { module: "writing" } } }
    },
    include: {
      candidate: { select: { name: true, email: true } },
      mockExam: { select: { id: true, title: true } },
      partAttempts: {
        where: { blueprint: { module: "writing" } },
        select: { resultJson: true }
      }
    },
    orderBy: { submittedAt: "desc" },
    take: 300
  });

  const standaloneWriting = await prisma.blueprintAttempt.findMany({
    where: {
      status: "submitted",
      mockAttemptId: null,
      blueprint: { module: "writing", orgId: me.orgId }
    },
    include: {
      candidate: { select: { name: true, email: true } },
      blueprint: { select: { title: true } }
    },
    orderBy: { submittedAt: "desc" },
    take: 300
  });

  const rows: WritingRow[] = [
    ...mockWriting.map((a) => {
      const w = a.partAttempts[0]?.resultJson as { writingBand?: number } | null;
      return {
        key: `m-${a.id}`,
        candidate: a.candidate.name ?? a.candidate.email,
        exam: a.mockExam.title,
        kind: "Mock" as const,
        submitted: a.submittedAt,
        submittedLabel: a.submittedAt ? a.submittedAt.toLocaleString() : "—",
        band: typeof w?.writingBand === "number" ? w.writingBand : null,
        href: `/admin/exam-import/mock/${a.mockExam.id}/attempt/${a.id}`
      };
    }),
    ...standaloneWriting.map((a) => {
      const w = a.resultJson as { kind?: string; writingBand?: number } | null;
      return {
        key: `s-${a.id}`,
        candidate: a.candidate.name ?? a.candidate.email,
        exam: a.blueprint.title,
        kind: "Standalone" as const,
        submitted: a.submittedAt,
        submittedLabel: a.submittedAt ? a.submittedAt.toLocaleString() : "—",
        band: w?.kind === "writing" && typeof w.writingBand === "number" ? w.writingBand : null,
        href: `/admin/writing/${a.id}`
      };
    })
  ].sort((x, y) => (y.submitted?.getTime() ?? 0) - (x.submitted?.getTime() ?? 0));

  return (
    <PageShell
      title="Writing Evaluation"
      subtitle="Score submitted Writing tasks (TR / CC / LR / GRA) and leave optional feedback. Covers both full mocks and standalone writing exams."
    >
      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          No writing submissions awaiting evaluation.
        </Card>
      ) : (
        <WritingEvaluationTable
          rows={rows.map(({ submitted: _submitted, ...row }) => row)}
        />
      )}
    </PageShell>
  );
}
