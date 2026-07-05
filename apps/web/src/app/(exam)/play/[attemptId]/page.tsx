import { notFound, redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { ExamPreview, type LiveAttempt } from "@/components/exam-import/ExamPreview";
import { mediaPublicUrl } from "@/lib/media-storage";
import type { PreviewExam } from "@/lib/exam-import-map";
import type { AnswersMap } from "@/components/question-engine/types";

export default async function PlayPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const attempt = await prisma.blueprintAttempt.findUnique({
    where: { id: attemptId },
    include: { blueprint: { include: { audioMedia: true } } }
  });
  if (!attempt || attempt.candidateId !== session.user.id) notFound();
  if (attempt.status === "submitted") redirect(`/play/${attemptId}/result`);

  const exam = attempt.blueprint.engineJson as unknown as PreviewExam;
  const audioUrl = attempt.blueprint.audioMedia
    ? mediaPublicUrl(attempt.blueprint.audioMedia.r2Key)
    : null;
  const live: LiveAttempt = {
    attemptId: attempt.id,
    deadlineAt: attempt.deadlineAt.toISOString(),
    serverNow: new Date().toISOString(),
    initialAnswers: (attempt.answersJson as unknown as AnswersMap) ?? {}
  };

  return <ExamPreview exam={exam} audioUrl={audioUrl} live={live} />;
}
