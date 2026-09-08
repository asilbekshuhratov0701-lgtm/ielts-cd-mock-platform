import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import {
  releaseMockResultAction,
  holdMockResultAction,
  setSpeakingBandAction
} from "@/lib/mock-actions";
import { overallWithSpeaking, partSummaryBand, bandLabel, type SummaryPart } from "@/lib/mock-band";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Results" };
export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const orgId = me?.orgId ?? "";

  const attempts = await prisma.mockAttempt.findMany({
    where: { mockExam: { orgId }, status: "submitted" },
    include: { candidate: true, mockExam: { select: { title: true } } },
    orderBy: { submittedAt: "desc" },
    take: 300
  });

  return (
    <PageShell
      title="Results"
      subtitle="Review submitted mock exams and release each candidate's bands when ready."
    >
      {attempts.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No submitted mock exams yet.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-brand-50/40 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">L</th>
                <th className="px-4 py-3 font-medium">R</th>
                <th className="px-4 py-3 font-medium">W</th>
                <th className="px-4 py-3 font-medium">Speaking</th>
                <th className="px-4 py-3 font-medium">Overall band</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attempts.map((a) => {
                const parts =
                  (a.resultJson as unknown as { parts?: SummaryPart[] } | null)?.parts ?? [];
                const bandOf = (module: string) => {
                  const part = parts.find((p) => p.module === module);
                  return part ? partSummaryBand(part) : null;
                };
                const overall = overallWithSpeaking(parts, a.speakingBand);
                return (
                  <tr key={a.id} className="align-middle hover:bg-brand-50/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {a.candidate.name ?? a.candidate.email}
                    </td>
                    <td className="px-4 py-3 text-muted">{a.mockExam.title}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {a.submittedAt ? a.submittedAt.toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {bandLabel(bandOf("listening"))}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {bandLabel(bandOf("reading"))}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {bandLabel(bandOf("writing"))}
                    </td>
                    <td className="px-4 py-3">
                      <form action={setSpeakingBandAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={a.id} />
                        <Input
                          name="speakingBand"
                          type="number"
                          min={0}
                          max={9}
                          step={0.5}
                          defaultValue={a.speakingBand ?? ""}
                          placeholder="—"
                          aria-label="Speaking band"
                          className="h-8 w-20 tabular-nums"
                        />
                        <Button type="submit" variant="ghost" size="sm">
                          Save
                        </Button>
                      </form>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-brand-700">
                      {bandLabel(overall)}
                    </td>
                    <td className="px-4 py-3">
                      {a.resultsReleased ? (
                        <Badge variant="success">Released</Badge>
                      ) : (
                        <Badge variant="muted">Held</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.resultsReleased ? (
                        <form action={holdMockResultAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Hold
                          </Button>
                        </form>
                      ) : (
                        <form action={releaseMockResultAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            Release
                          </Button>
                        </form>
                      )}
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
