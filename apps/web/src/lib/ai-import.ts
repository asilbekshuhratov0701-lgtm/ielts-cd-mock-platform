import { extractText, getDocumentProxy } from "unpdf";
import { prisma, Prisma } from "@ielts/db";
import { generateExamDraft, type ExamDraft } from "@ielts/ai";
import type { QuestionTypeKey } from "@ielts/core";

type SectionKind = "LISTENING" | "READING" | "WRITING";
type AnswerType = "SINGLE" | "MULTI" | "TEXT" | "DROPDOWN" | "MATCH";

const SECTION_KINDS = new Set<SectionKind>(["LISTENING", "READING", "WRITING"]);
const ANSWER_TYPES = new Set<AnswerType>(["SINGLE", "MULTI", "TEXT", "DROPDOWN", "MATCH"]);
const QUESTION_TYPES = new Set<QuestionTypeKey>([
  "MULTIPLE_CHOICE",
  "MULTIPLE_ANSWER",
  "TRUE_FALSE_NOT_GIVEN",
  "YES_NO_NOT_GIVEN",
  "MATCHING_HEADINGS",
  "MATCHING_INFORMATION",
  "MATCHING_FEATURES",
  "MATCHING_SENTENCE_ENDINGS",
  "SENTENCE_COMPLETION",
  "SUMMARY_COMPLETION",
  "NOTE_COMPLETION",
  "TABLE_COMPLETION",
  "FLOW_CHART_COMPLETION",
  "DIAGRAM_LABELLING",
  "MAP_LABELLING",
  "PLAN_LABELLING",
  "SHORT_ANSWER",
  "CLASSIFICATION"
]);

function kindOf(value: string): SectionKind {
  return SECTION_KINDS.has(value as SectionKind) ? (value as SectionKind) : "READING";
}
function answerTypeOf(value: string): AnswerType {
  return ANSWER_TYPES.has(value as AnswerType) ? (value as AnswerType) : "TEXT";
}
function typeOf(value: string): QuestionTypeKey {
  return QUESTION_TYPES.has(value as QuestionTypeKey) ? (value as QuestionTypeKey) : "SHORT_ANSWER";
}
function durationOf(kind: SectionKind): number {
  return kind === "LISTENING" ? 1800 : 3600;
}

export async function extractPdfText(data: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

export function buildSectionsCreate(draft: ExamDraft) {
  return draft.sections.map((section, si) => {
    const kind = kindOf(section.kind);
    const durationSec =
      section.durationSec && section.durationSec > 0
        ? Math.round(section.durationSec)
        : durationOf(kind);

    const passages = section.passages?.length
      ? {
          create: section.passages.map((p, pi) => ({
            order: pi,
            title: p.title?.trim() || null,
            bodyRichtext: p.body ?? ""
          }))
        }
      : undefined;

    const writingTasks = section.writingTasks?.length
      ? {
          create: section.writingTasks.map((t) => ({
            taskNo: t.taskNo || 1,
            promptRichtext: t.prompt ?? "",
            minWords: t.minWords && t.minWords > 0 ? t.minWords : t.taskNo === 2 ? 250 : 150
          }))
        }
      : undefined;

    const questionGroups = section.groups?.length
      ? {
          create: section.groups.map((g, gi) => {
            const used = new Set<number>();
            let fallback = 0;
            const questions = (g.questions ?? []).map((q) => {
              let number = Number.isInteger(q.number) && q.number > 0 ? q.number : ++fallback;
              while (used.has(number)) number += 1;
              used.add(number);

              const answerType = answerTypeOf(q.answerType);
              const options = q.options?.length
                ? {
                    create: q.options.map((o, oi) => ({
                      label: o.label ?? o.value ?? "",
                      value: o.value ?? "",
                      order: oi
                    }))
                  }
                : undefined;

              const accepted = (q.acceptedAnswers ?? [])
                .map((a) => String(a).trim())
                .filter(Boolean);
              const answerKey = accepted.length
                ? {
                    create: {
                      acceptedJson: accepted as unknown as Prisma.InputJsonValue,
                      matchMode: (answerType === "TEXT" ? "CONTAINS" : "EXACT") as
                        | "EXACT"
                        | "CONTAINS"
                    }
                  }
                : undefined;

              return { number, prompt: q.prompt ?? "", answerType, options, answerKey };
            });

            return {
              type: typeOf(g.type),
              order: gi,
              instructionsRichtext: g.instructions ?? "",
              questions: questions.length ? { create: questions } : undefined
            };
          })
        }
      : undefined;

    return { kind, order: si, durationSec, passages, writingTasks, questionGroups };
  });
}

export async function importExamFromPdf(params: {
  orgId: string;
  createdById: string;
  filename: string;
  data: Uint8Array;
}): Promise<{ examId: string; jobId: string }> {
  const job = await prisma.importJob.create({
    data: {
      orgId: params.orgId,
      status: "PARSING",
      createdById: params.createdById,
      logJson: { filename: params.filename } as Prisma.InputJsonValue
    }
  });

  try {
    const text = await extractPdfText(params.data);
    if (!text.trim()) throw new Error("No text could be extracted from the PDF.");

    await prisma.importArtifact.create({
      data: { jobId: job.id, role: "SOURCE_DOC", parsedText: text.slice(0, 200000) }
    });
    await prisma.importJob.update({ where: { id: job.id }, data: { status: "ANALYZING" } });

    const draft = await generateExamDraft(text, {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.AI_MODEL_PRIMARY ?? "claude-opus-4-8",
      provider: process.env.AI_PROVIDER === "mock" ? "mock" : "anthropic"
    });

    const exam = await prisma.exam.create({
      data: {
        orgId: params.orgId,
        title: draft.title,
        moduleType: draft.moduleType,
        status: "DRAFT",
        source: "AI_IMPORT",
        createdById: params.createdById,
        sections: { create: buildSectionsCreate(draft) }
      }
    });

    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "NEEDS_REVIEW", examDraftId: exam.id }
    });

    return { examId: exam.id, jobId: job.id };
  } catch (error) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        logJson: {
          filename: params.filename,
          error: error instanceof Error ? error.message : String(error)
        } as Prisma.InputJsonValue
      }
    });
    throw error;
  }
}
