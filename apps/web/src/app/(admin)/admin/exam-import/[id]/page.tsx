import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Music, Play, Send, Trash2, Undo2, Upload } from "lucide-react";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExamPreview } from "@/components/exam-import/ExamPreview";
import { mediaPublicUrl } from "@/lib/media-storage";
import type { PreviewExam } from "@/lib/exam-import-map";
import {
  attachAudioAction,
  deleteBlueprintAction,
  publishBlueprintAction,
  unpublishBlueprintAction
} from "@/lib/exam-blueprint-actions";
import { startBlueprintAttemptAction } from "@/lib/blueprint-play-actions";

const stateVariant: Record<string, "default" | "warning" | "success"> = {
  draft: "default",
  audio_pending: "warning",
  published: "success"
};

const field =
  "h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-brand-700";

export default async function ExamBlueprintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bp = await prisma.examBlueprint.findUnique({
    where: { id },
    include: { audioMedia: true }
  });
  if (!bp) notFound();

  const exam = bp.engineJson as unknown as PreviewExam;
  const audioUrl = bp.audioMedia ? mediaPublicUrl(bp.audioMedia.r2Key) : null;
  const needsAudio = bp.module === "listening" && Boolean(bp.audioRef);

  return (
    <PageShell
      title={bp.title}
      subtitle={`${bp.module} · v${bp.version} · ${bp.totalQuestions} questions`}
      actions={
        <div className="flex items-center gap-2">
          {bp.state === "published" ? (
            <>
              <form action={startBlueprintAttemptAction}>
                <input type="hidden" name="blueprintId" value={bp.id} />
                <Button type="submit" variant="secondary">
                  <Play className="h-4 w-4" /> Take exam
                </Button>
              </form>
              <form action={unpublishBlueprintAction}>
                <input type="hidden" name="id" value={bp.id} />
                <Button type="submit" variant="outline">
                  <Undo2 className="h-4 w-4" /> Unpublish
                </Button>
              </form>
            </>
          ) : (
            <form action={publishBlueprintAction}>
              <input type="hidden" name="id" value={bp.id} />
              <Button type="submit" variant="success" disabled={bp.state === "audio_pending"}>
                <Send className="h-4 w-4" /> Publish
              </Button>
            </form>
          )}
          <form action={deleteBlueprintAction}>
            <input type="hidden" name="id" value={bp.id} />
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
        <ArrowLeft className="h-4 w-4" /> Back to exam import
      </Link>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Badge variant={stateVariant[bp.state] ?? "default"}>{bp.state}</Badge>
        <span className="text-sm text-muted">
          {bp.state === "audio_pending"
            ? "Attach the Listening audio file to move this exam out of audio_pending; publishing is blocked until then."
            : bp.state === "published"
              ? "Published. Unpublish to fix a key or re-upload a corrected JSON."
              : "Draft. Publish when you are ready."}
        </span>
      </Card>

      {needsAudio ? (
        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-foreground">
            <Music className="h-4 w-4 text-brand-600" /> Listening audio
            {bp.audioMedia ? <Badge variant="success">attached</Badge> : null}
          </h2>
          <p className="mb-3 text-sm text-muted">
            One continuous file for the whole module, bound to <code>{bp.audioRef}</code>.
            {bp.audioMedia ? ` Current: ${bp.audioMedia.originalName ?? bp.audioMedia.r2Key}.` : ""}
          </p>
          <form action={attachAudioAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={bp.id} />
            <input type="file" name="audio" accept="audio/*" className={`${field} max-w-md`} />
            <Button type="submit" variant="secondary">
              <Upload className="h-4 w-4" /> {bp.audioMedia ? "Replace audio" : "Attach audio"}
            </Button>
          </form>
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-foreground">CD preview</h2>
        <ExamPreview exam={exam} audioUrl={audioUrl} />
      </Card>
    </PageShell>
  );
}
