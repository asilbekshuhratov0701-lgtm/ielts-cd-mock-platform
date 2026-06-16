import { prisma } from "@ielts/db";
import {
  bandFromRaw,
  scoreObjectiveSection,
  DEFAULT_ACADEMIC_READING_TABLE,
  DEFAULT_LISTENING_TABLE,
  type CandidateResponse,
  type KeyedAnswer,
  type MatchMode
} from "@ielts/core";
import { getReleaseMode } from "@/lib/settings";

function scaleToForty(rawCorrect: number, total: number): number {
  if (total <= 0) return 0;
  if (total === 40) return rawCorrect;
  return Math.round((rawCorrect / total) * 40);
}

export async function scoreAttempt(attemptId: string): Promise<void> {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          sections: {
            include: {
              questionGroups: { include: { questions: { include: { answerKey: true } } } }
            }
          }
        }
      },
      sectionAttempts: { include: { answers: true } }
    }
  });
  if (!attempt) return;

  let listeningRaw: number | null = null;
  let listeningBand: number | null = null;
  let readingRaw: number | null = null;
  let readingBand: number | null = null;

  for (const section of attempt.exam.sections) {
    if (section.kind !== "LISTENING" && section.kind !== "READING") continue;

    const sectionAttempt = attempt.sectionAttempts.find((sa) => sa.sectionId === section.id);
    const responses: CandidateResponse[] = (sectionAttempt?.answers ?? []).map((a) => ({
      questionId: a.questionId,
      response: a.responseJson
    }));

    const keys: KeyedAnswer[] = [];
    for (const group of section.questionGroups) {
      for (const question of group.questions) {
        if (!question.answerKey) continue;
        keys.push({
          questionId: question.id,
          accepted: (question.answerKey.acceptedJson as unknown as string[]) ?? [],
          matchMode: question.answerKey.matchMode as MatchMode,
          caseSensitive: question.answerKey.caseSensitive,
          points: question.points
        });
      }
    }
    if (keys.length === 0) continue;

    const result = scoreObjectiveSection(keys, responses);
    const scaled = scaleToForty(result.rawCorrect, result.total);
    const table =
      section.kind === "LISTENING" ? DEFAULT_LISTENING_TABLE : DEFAULT_ACADEMIC_READING_TABLE;
    const band = bandFromRaw(table, scaled);

    if (section.kind === "LISTENING") {
      listeningRaw = result.rawCorrect;
      listeningBand = band;
    } else {
      readingRaw = result.rawCorrect;
      readingBand = band;
    }
  }

  const releaseMode = await getReleaseMode(attempt.exam.orgId);

  await prisma.score.upsert({
    where: { attemptId },
    update: {
      listeningRaw,
      listeningBand,
      readingRaw,
      readingBand,
      ...(releaseMode === "manual" ? {} : { publishedAt: new Date() })
    },
    create: {
      attemptId,
      listeningRaw,
      listeningBand,
      readingRaw,
      readingBand,
      publishedAt: releaseMode === "manual" ? null : new Date()
    }
  });
}
