import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertTriangle, Play, Send, Trash2, Undo2 } from "lucide-react";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deleteMockAction,
  publishMockAction,
  unpublishMockAction,
  startMockAttemptAction
} from "@/lib/mock-actions";

const stateVariant: Record<string, "default" | "warning" | "success"> = {
  draft: "default",
  audio_pending: "warning",
  published: "success"
};

export default async function MockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mock = await prisma.mockExam.findUnique({
    where: { id },
    include: {
      parts: { include: { blueprint: { include: { audioMedia: true } } }, orderBy: { order: "asc" } }
    }
  });
  if (!mock) notFound();

  const readiness = mock.parts.map((p) => {
    const needsAudio = p.module === "listening" && Boolean(p.blueprint.audioRef);
    const audioOk = !needsAudio || Boolean(p.blueprint.audioMediaId);
    const published = p.blueprint.state === "published";
    return { part: p, ready: published && audioOk, published, audioOk, needsAudio };
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
              ? "All parts are ready. Publish when you want candidates to see it."
              : "Every part must be published (Listening needs its audio) before this mock can be published."}
        </span>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-foreground">Parts</h2>
        <ul className="divide-y divide-border">
          {readiness.map(({ part, ready, published, audioOk, needsAudio }) => (
            <li key={part.id} className="flex items-center justify-between gap-3 py-3">
              <Link
                href={`/admin/exam-import/${part.blueprintId}`}
                className="flex min-w-0 items-center gap-2 hover:underline"
              >
                {ready ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                )}
                <span className="truncate font-medium text-foreground">{part.blueprint.title}</span>
                <span className="text-xs uppercase text-muted">{part.module}</span>
              </Link>
              <span className="flex shrink-0 items-center gap-2 text-xs">
                {!published ? <Badge variant="default">{part.blueprint.state}</Badge> : null}
                {needsAudio && !audioOk ? <Badge variant="warning">audio missing</Badge> : null}
                {ready ? <Badge variant="success">ready</Badge> : null}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </PageShell>
  );
}
