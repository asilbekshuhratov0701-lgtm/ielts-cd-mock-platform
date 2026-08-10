import Link from "next/link";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Writing Evaluation" };
export const dynamic = "force-dynamic";

interface WritingRow {
  key: string;
  candidate: string;
  exam: string;
  kind: "Mock" | "Standalone";
  submitted: Date | null;
  band: number | null;
  href: string;
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
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-brand-50/40 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-brand-50/30">
                  <td className="px-4 py-3 font-medium text-foreground">{r.candidate}</td>
                  <td className="px-4 py-3 text-muted">{r.exam}</td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">{r.kind}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {r.submitted ? r.submitted.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.band !== null ? (
                      <Badge variant="success">band {r.band.toFixed(1)}</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={r.href} className="font-medium text-brand-700 hover:underline">
                      Evaluate
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}
