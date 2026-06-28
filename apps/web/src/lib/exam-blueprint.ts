import { prisma, Prisma } from "@ielts/db";
import { validateExamFile, type ExamFile, type ValidationReport } from "@ielts/validators";
import { mapExamFile } from "@/lib/exam-import-map";

export type BlueprintState = "draft" | "audio_pending" | "published";

export interface AnswerKeyEntry {
  number?: number;
  numbers?: number[];
  accepted: string[];
  orderIndependent?: boolean;
}

export function extractAnswerKey(exam: ExamFile): Record<string, AnswerKeyEntry> {
  const key: Record<string, AnswerKeyEntry> = {};
  for (const section of exam.sections) {
    for (const group of section.groups) {
      for (const q of group.questions) {
        if (q.type === "gap") {
          key[q.id] = { number: q.number, accepted: q.answer };
        } else if (q.type === "checkbox") {
          key[q.id] = {
            numbers: q.numbers,
            accepted: q.answer,
            orderIndependent: q.orderIndependent ?? true
          };
        } else {
          key[q.id] = { number: q.number, accepted: [q.answer] };
        }
      }
    }
  }
  return key;
}

export function initialState(exam: ExamFile): BlueprintState {
  if (exam.module === "listening" && exam.audio?.required) return "audio_pending";
  return "draft";
}

export async function createBlueprintFromJson(params: {
  orgId: string;
  createdById: string;
  rawJson: unknown;
}): Promise<
  | { ok: true; blueprintId: string; report: ValidationReport }
  | { ok: false; report: ValidationReport }
> {
  const report = validateExamFile(params.rawJson);
  if (!report.ok || !report.parsed) return { ok: false, report };

  const exam = report.parsed;
  const engine = mapExamFile(exam);
  const answerKey = extractAnswerKey(exam);

  const prior = await prisma.examBlueprint.aggregate({
    where: { orgId: params.orgId, examKey: exam.examId },
    _max: { version: true }
  });
  const version = (prior._max.version ?? 0) + 1;

  const blueprint = await prisma.examBlueprint.create({
    data: {
      orgId: params.orgId,
      examKey: exam.examId,
      module: exam.module,
      title: exam.title,
      version,
      state: initialState(exam),
      totalQuestions: exam.totalQuestions,
      timerSource: exam.timerSource,
      timeLimitMin: exam.timeLimitMinutes ?? null,
      audioRef: exam.audio?.ref ?? null,
      sourceJson: params.rawJson as Prisma.InputJsonValue,
      engineJson: engine as unknown as Prisma.InputJsonValue,
      answerKeyJson: answerKey as unknown as Prisma.InputJsonValue,
      createdById: params.createdById
    }
  });

  return { ok: true, blueprintId: blueprint.id, report };
}
