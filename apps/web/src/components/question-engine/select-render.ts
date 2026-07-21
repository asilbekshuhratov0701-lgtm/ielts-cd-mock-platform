import type { QuestionType } from "./types";

export type SelectRenderAs = "dropdown" | "drag" | "table";
export type ExamModule = "reading" | "listening" | "writing";

const DRAG_QUESTION_TYPES = new Set<QuestionType>([
  "matching_headings",
  "matching_sentence_endings",
  "matching_features",
  "summary_completion"
]);

const READING_TABLE_QUESTION_TYPES = new Set<QuestionType>([
  "matching_features",
  "matching_information"
]);

export function selectRenderAs(
  explicit: string | undefined,
  questionType: QuestionType,
  module: ExamModule
): SelectRenderAs {
  if (explicit === "dropdown" || explicit === "drag" || explicit === "table") return explicit;
  if (module === "reading" && READING_TABLE_QUESTION_TYPES.has(questionType)) return "table";
  return DRAG_QUESTION_TYPES.has(questionType) ? "drag" : "dropdown";
}
