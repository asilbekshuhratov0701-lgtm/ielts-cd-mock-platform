import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExportMenu } from "@/components/candidates/ExportMenu";
import { overallWithSpeaking, partSummaryBand, bandLabel, type SummaryPart } from "@/lib/mock-band";

export const metadata = { title: "Candidate" };
export const dynamic = "force-dynamic";

export default async function AdminCandidatePage({
  params
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) redirect("/login");

  const candidate = await prisma.user.findFirst({
    where: { id: candidateId, orgId: me.orgId, role: "CANDIDATE" },
    include: {
      candidateProfile: true,
      groupMemberships: { select: { group: { select: { id: true, name: true } } } },
      mockAttempts: {
        include: { mockExam: { select: { title: true } } },
        orderBy: { submittedAt: "desc" }
      }
    }
  });
  if (!candidate) notFound();

  const submitted = candidate.mockAttempts.filter((a) => a.status === "submitted");

  return (
    <PageShell
      title={candidate.name ?? candidate.email}
      subtitle={`${candidate.email}${
        candidate.candidateProfile?.phone ? ` · ${candidate.candidateProfile.phone}` : ""
      }`}
      actions={
        <Link href="/admin/candidates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" /> All candidates
          </Button>
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={candidate.status === "ACTIVE" ? "success" : "danger"}>
          {candidate.status}
        </Badge>
        {candidate.groupMemberships.map((m) => (
          <Badge key={m.group.id} variant="muted">
            {m.group.name}
          </Badge>
        ))}
      </div>

      {submitted.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          This candidate has no submitted mock exams yet.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-brand-50/40 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Mock exam</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">L</th>
                <th className="px-4 py-3 font-medium">R</th>
                <th className="px-4 py-3 font-medium">W</th>
                <th className="px-4 py-3 font-medium">S</th>
                <th className="px-4 py-3 font-medium">Overall</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {submitted.map((attempt) => {
                const parts =
                  (attempt.resultJson as unknown as { parts?: SummaryPart[] } | null)?.parts ?? [];
                const bandOf = (module: string) => {
                  const part = parts.find((p) => p.module === module);
                  return part ? partSummaryBand(part) : null;
                };
                const overall = overallWithSpeaking(parts, attempt.speakingBand);
                return (
                  <tr key={attempt.id} className="align-middle hover:bg-brand-50/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {attempt.mockExam.title}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {attempt.submittedAt ? attempt.submittedAt.toLocaleDateString() : "—"}
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
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {bandLabel(attempt.speakingBand ?? null)}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-brand-700">
                      {bandLabel(overall)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ExportMenu
                        endpoint="candidate-detail"
                        params={{ attemptId: attempt.id }}
                        label="Detailed result"
                      />
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
