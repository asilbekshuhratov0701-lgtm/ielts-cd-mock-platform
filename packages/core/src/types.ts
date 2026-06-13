/**
 * Canonical domain types shared across the platform.
 * Kept independent of Prisma's generated types so this package typechecks standalone;
 * the database layer (@ielts/db) has its own generated row types.
 */

export type Role = "SUPER_ADMIN" | "ADMIN" | "EXAMINER" | "CANDIDATE";
export type ModuleType = "ACADEMIC" | "GENERAL";
export type SectionKind = "LISTENING" | "READING" | "WRITING";

export type ContentStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "PREVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "ASSIGNED"
  | "ARCHIVED";

export type AttemptStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "GRADED"
  | "PUBLISHED"
  | "EXPIRED"
  | "ABANDONED";

export type WritingEvalStatus = "PENDING" | "ASSIGNED" | "IN_REVIEW" | "COMPLETED" | "PUBLISHED";

/** Full official IELTS question-type set; one renderer per key in the UI registry. */
export type QuestionTypeKey =
  | "MULTIPLE_CHOICE"
  | "MULTIPLE_ANSWER"
  | "TRUE_FALSE_NOT_GIVEN"
  | "YES_NO_NOT_GIVEN"
  | "MATCHING_HEADINGS"
  | "MATCHING_INFORMATION"
  | "MATCHING_FEATURES"
  | "MATCHING_SENTENCE_ENDINGS"
  | "SENTENCE_COMPLETION"
  | "SUMMARY_COMPLETION"
  | "NOTE_COMPLETION"
  | "TABLE_COMPLETION"
  | "FLOW_CHART_COMPLETION"
  | "DIAGRAM_LABELLING"
  | "MAP_LABELLING"
  | "PLAN_LABELLING"
  | "SHORT_ANSWER"
  | "CLASSIFICATION"
  | "WRITING_TASK_1"
  | "WRITING_TASK_2";

/** Raw-correct (0-40) -> band mapping. Stored in Settings and passed to the scorer. */
export type BandConversionTable = Record<number, number>;

export interface WritingCriteria {
  taskResponse: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammaticalRange: number;
}

export interface ScoreBreakdown {
  listeningRaw?: number;
  listeningBand?: number;
  readingRaw?: number;
  readingBand?: number;
  writingBand?: number;
  overallBand?: number;
}
