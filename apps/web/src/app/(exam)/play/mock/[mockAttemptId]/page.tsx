import { notFound, redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { ExamPreview, type LiveAttempt } from "@/components/exam-import/ExamPreview";
import { ExamHoldScreen } from "@/components/exam/ExamHoldScreen";
import { SectionIntro } from "@/components/exam/SectionIntro";
import { holdReason, answeredCount } from "@/lib/live";
import { sectionIntroCopy } from "@/lib/section-intro";
import { durationSecFor, MODULE_LABEL } from "@/lib/mock";
import { mediaPublicUrl } from "@/lib/media-storage";
import type { PreviewExam } from "@/lib/exam-import-map";
import type { AnswersMap } from "@/components/question-engine/types";
import type { Annotations } from "@/components/exam-import/SelectionLayer";

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

  if (!partAttempt.beganAt) {
    return (
      <SectionIntro
        attemptId={partAttempt.id}
        module={part.module}
        examTitle={mockAttempt.mockExam.title}
        copy={sectionIntroCopy({
          module: part.module,
          durationSec: durationSecFor(part.module, part.blueprint.timeLimitMin),
          totalQuestions: part.blueprint.totalQuestions,
          sectionCount: exam.sections?.length ?? 0
        })}
        steps={parts.map((p, i) => ({
          label: MODULE_LABEL[p.module] ?? p.module,
          state:
            i < mockAttempt.currentIndex ? "done" : i === mockAttempt.currentIndex ? "current" : "upcoming"
        }))}
      />
    );
  }

  const hold = holdReason(partAttempt);
  if (hold) {
    return (
      <ExamHoldScreen
        reason={hold}
        examTitle={`${mockAttempt.mockExam.title} — ${part.blueprint.title}`}
        answered={answeredCount(partAttempt.answersJson)}
        totalQuestions={part.blueprint.totalQuestions}
      />
    );
  }

  const audioUrl = part.blueprint.audioMedia
    ? mediaPublicUrl(part.blueprint.audioMedia.r2Key)
    : null;
  const live: LiveAttempt = {
    attemptId: partAttempt.id,
    deadlineAt: partAttempt.deadlineAt.toISOString(),
    serverNow: new Date().toISOString(),
    initialAnswers: (partAttempt.answersJson as unknown as AnswersMap) ?? {},
    initialAnnotations: (partAttempt.annotationsJson as unknown as Annotations) ?? {
      notes: [],
      highlights: []
    },
    mock: { mockAttemptId, index: mockAttempt.currentIndex, count: parts.length }
  };

  return <ExamPreview key={live.attemptId} exam={exam} audioUrl={audioUrl} live={live} />;
}
