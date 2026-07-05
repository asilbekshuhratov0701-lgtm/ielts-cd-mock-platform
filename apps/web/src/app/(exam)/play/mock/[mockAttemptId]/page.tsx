import { notFound, redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { ExamPreview, type LiveAttempt } from "@/components/exam-import/ExamPreview";
import { mediaPublicUrl } from "@/lib/media-storage";
import type { PreviewExam } from "@/lib/exam-import-map";
import type { AnswersMap } from "@/components/question-engine/types";

export default async function MockPlayPage({
  params
}: {
  params: Promise<{ mockAttemptId: string }>;
}) {
  const { mockAttemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const mockAttempt = await prisma.mockAttempt.findUnique({
    where: { id: mockAttemptId },
    include: {
      mockExam: {
        include: {
          parts: {
            include: { blueprint: { include: { audioMedia: true } } },
            orderBy: { order: "asc" }
          }
        }
      }
    }
  });
  if (!mockAttempt || mockAttempt.candidateId !== session.user.id) notFound();
  if (mockAttempt.status === "submitted") redirect(`/play/mock/${mockAttemptId}/result`);

  const parts = mockAttempt.mockExam.parts;
  const part = parts[mockAttempt.currentIndex];
  if (!part) redirect("/play");

  const partAttempt = await prisma.blueprintAttempt.findFirst({
    where: { mockAttemptId, partOrder: mockAttempt.currentIndex },
    orderBy: { createdAt: "desc" }
  });
  if (!partAttempt) redirect("/play");

  const exam = part.blueprint.engineJson as unknown as PreviewExam;
  const audioUrl = part.blueprint.audioMedia
    ? mediaPublicUrl(part.blueprint.audioMedia.r2Key)
    : null;
  const live: LiveAttempt = {
    attemptId: partAttempt.id,
    deadlineAt: partAttempt.deadlineAt.toISOString(),
    serverNow: new Date().toISOString(),
    initialAnswers: (partAttempt.answersJson as unknown as AnswersMap) ?? {},
    mock: { mockAttemptId, index: mockAttempt.currentIndex, count: parts.length }
  };

  return <ExamPreview exam={exam} audioUrl={audioUrl} live={live} />;
}
