import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Music,
  Play,
  Send,
  Trash2,
  Undo2,
  Upload
} from "lucide-react";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { attachAudioAction } from "@/lib/exam-blueprint-actions";
import {
  deleteMockAction,
  publishMockAction,
  unpublishMockAction,
  startMockAttemptAction
} from "@/lib/mock-actions";
import { skillBand, overallBandFrom, bandLabel } from "@/lib/mock-band";

const stateVariant: Record<string, "default" | "warning" | "success"> = {
  draft: "default",
  audio_pending: "warning",
  published: "success"
};

const fileField =
  "h-9 max-w-xs rounded-lg border border-border bg-surface px-3 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-brand-700";

export default async function MockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mock = await prisma.mockExam.findUnique({
    where: { id },
    include: {
      parts: { include: { blueprint: { include: { audioMedia: true } } }, orderBy: { order: "asc" } }
    }
  });
  if (!mock) notFound();

  const attempts = await prisma.mockAttempt.findMany({
    where: { mockExamId: id },
    include: { candidate: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const readiness = mock.parts.map((p) => {
    const needsAudio = p.module === "listening" && Boolean(p.blueprint.audioRef);
    const audioOk = !needsAudio || Boolean(p.blueprint.audioMediaId);
    return { part: p, ready: audioOk, audioOk, needsAudio };
  });
  const allReady = readiness.length > 0 && readiness.every((r) => r.ready);
  const totalQuestions = mock.parts.reduce((s, p) => s + p.blueprint.totalQuestions, 0);

  return (
    <PageShell
      title={mock.title}
      subtitle={`Full mock · ${mock.parts.length} parts · ${totalQuestions} questions`}
      actions={
        <div className="flex items-center gap-2">
          {mock.state === "published" ? (
            <>
              <form action={startMockAttemptAction}>
                <input type="hidden" name="mockExamId" value={mock.id} />
                <Button type="submit" variant="secondary">
                  <Play className="h-4 w-4" /> Take exam
                </Button>
              </form>
              <form action={unpublishMockAction}>
                <input type="hidden" name="id" value={mock.id} />
                <Button type="submit" variant="outline">
                  <Undo2 className="h-4 w-4" /> Unpublish
                </Button>
              </form>
            </>
          ) : (
            <form action={publishMockAction}>
              <input type="hidden" name="id" value={mock.id} />
              <Button type="submit" variant="success" disabled={!allReady}>
                <Send className="h-4 w-4" /> Publish
              </Button>
            </form>
          )}
          <form action={deleteMockAction}>
            <input type="hidden" name="id" value={mock.id} />
            <Button type="submit" variant="ghost">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </form>
        </div>
      }
    >
      <Link
        href="/admin/exam-import"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to exam builder
      </Link>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Badge variant={stateVariant[mock.state] ?? "default"}>{mock.state}</Badge>
        <span className="text-sm text-muted">
          {mock.state === "published"
            ? "Published — candidates can take it end-to-end from /play."
            : allReady
              ? "All parts are ready. Publishing makes the mock and its parts live in one step."
              : "Attach the Listening audio below, then publish — it will publish every part too."}
        </span>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-foreground">Parts</h2>
        <ul className="divide-y divide-border">
          {readiness.map(({ part, ready, audioOk, needsAudio }) => (
            <li key={part.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/admin/exam-import/${part.blueprintId}`}
                  className="flex min-w-0 items-center gap-2 hover:underline"
                >
                  {ready ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <span className="truncate font-medium text-foreground">
                    {part.blueprint.title}
                  </span>
                  <span className="text-xs uppercase text-muted">{part.module}</span>
                </Link>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  {needsAudio && !audioOk ? (
                    <Badge variant="warning">audio missing</Badge>
                  ) : (
                    <Badge variant="success">ready</Badge>
                  )}
                </span>
              </div>
              {needsAudio ? (
                <form
                  action={attachAudioAction}
                  className="mt-2 flex flex-wrap items-center gap-2 pl-6"
                >
                  <input type="hidden" name="id" value={part.blueprintId} />
                  <input type="hidden" name="mockId" value={mock.id} />
                  <input type="file" name="audio" accept="audio/*" className={fileField} required />
                  <Button type="submit" size="sm" variant="secondary">
                    <Upload className="h-4 w-4" /> {audioOk ? "Replace audio" : "Attach audio"}
                  </Button>
                  {part.blueprint.audioMedia ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Music className="h-3.5 w-3.5" />
                      {part.blueprint.audioMedia.originalName ?? "attached"}
                    </span>
                  ) : null}
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-foreground">
          Candidate attempts{" "}
          <span className="text-sm font-normal text-muted">({attempts.length})</span>
        </h2>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted">No one has taken this mock yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Candidate</th>
                  <th className="px-3 py-2 font-medium">Submitted</th>
                  <th className="px-3 py-2 font-medium">Overall band</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attempts.map((a) => {
                  const r = a.resultJson as unknown as {
                    parts?: { module: string; rawScore: number; totalScore: number }[];
                  } | null;
                  const overall = overallBandFrom(
                    (r?.parts ?? []).map((p) => skillBand(p.module, p.rawScore, p.totalScore))
                  );
                  return (
                    <tr key={a.id} className="align-middle hover:bg-brand-50/30">
                      <td className="px-3 py-2 font-medium text-foreground">
                        {a.candidate.name ?? a.candidate.email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted">
                        {a.submittedAt ? a.submittedAt.toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-2 font-semibold tabular-nums text-brand-700">
                        {a.status === "submitted" ? bandLabel(overall) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={a.status === "submitted" ? "success" : "warning"}>
                          {a.status === "submitted" ? "submitted" : "in progress"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/admin/exam-import/mock/${mock.id}/attempt/${a.id}`}
                          className="text-sm text-brand-600 hover:underline"
                        >
                          View answers
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
