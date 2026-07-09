import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Image as ImageIcon, Music, Play, Send, Trash2, Undo2, Upload } from "lucide-react";
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
  attachGroupImageAction,
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

  const imageGroups = (exam.sections ?? []).flatMap((section) =>
    section.groups
      .filter((g) => g.questionType === "map_labelling" || g.questionType === "diagram_labelling")
      .map((g) => ({
        id: g.id,
        questionType: g.questionType,
        range: g.numberRange,
        imageUrl: (g as { imageUrl?: string }).imageUrl
      }))
  );
  const typeLabel = (t: string) => (t === "map_labelling" ? "Map labelling" : "Diagram labelling");

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

      {imageGroups.length > 0 ? (
        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-foreground">
            <ImageIcon className="h-4 w-4 text-brand-600" /> Map / diagram images
          </h2>
          <p className="mb-3 text-sm text-muted">
            Upload the picture candidates see for each labelling task. Answers stay as dropdowns.
          </p>
          <div className="space-y-4">
            {imageGroups.map((g) => (
              <div key={g.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {typeLabel(g.questionType)}
                    <span className="ml-2 text-xs font-normal text-muted">
                      Q{g.range[0]}
                      {g.range[1] !== g.range[0] ? `–${g.range[1]}` : ""}
                    </span>
                  </span>
                  <Badge variant={g.imageUrl ? "success" : "warning"}>
                    {g.imageUrl ? "image attached" : "no image"}
                  </Badge>
                </div>
                {g.imageUrl ? (
                  <img
                    src={g.imageUrl}
                    alt="Uploaded map or diagram"
                    className="mt-3 max-h-48 rounded-lg border border-border"
                  />
                ) : null}
                <form
                  action={attachGroupImageAction}
                  className="mt-3 flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="id" value={bp.id} />
                  <input type="hidden" name="groupId" value={g.id} />
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    className={`${field} max-w-md`}
                    required
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    <Upload className="h-4 w-4" /> {g.imageUrl ? "Replace image" : "Upload image"}
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-foreground">CD preview</h2>
        <ExamPreview exam={exam} audioUrl={audioUrl} />
      </Card>
    </PageShell>
  );
}
