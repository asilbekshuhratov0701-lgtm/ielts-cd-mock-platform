import Link from "next/link";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Writing Evaluation" };
export const dynamic = "force-dynamic";

export default async function AdminWritingPage() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const mockWriting = me
    ? await prisma.mockAttempt.findMany({
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
      })
    : [];

  return (
    <PageShell
      title="Writing Evaluation"
      subtitle="Score submitted Writing tasks (TR / CC / LR / GRA). The Writing band folds into the candidate's overall band."
    >
      {mockWriting.length === 0 ? (
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
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockWriting.map((a) => {
                const w = a.partAttempts[0]?.resultJson as { writingBand?: number } | null;
                const scored = typeof w?.writingBand === "number";
                return (
                  <tr key={a.id} className="hover:bg-brand-50/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {a.candidate.name ?? a.candidate.email}
                    </td>
                    <td className="px-4 py-3 text-muted">{a.mockExam.title}</td>
                    <td className="px-4 py-3 text-muted">
                      {a.submittedAt ? a.submittedAt.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {scored ? (
                        <Badge variant="success">band {w!.writingBand!.toFixed(1)}</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/exam-import/mock/${a.mockExam.id}/attempt/${a.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        Evaluate
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}
