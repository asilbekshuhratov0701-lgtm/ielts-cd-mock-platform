/**
 * Shared Zod schemas used by both apps/web (route handlers) and apps/worker.
 * Validation lives here so request shapes stay consistent across the codebase.
 * These are representative schemas for the skeleton — extend per endpoint.
 */
import { z } from "zod";

// --- Auth ---
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional().default(false)
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200)
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(200)
});

// --- Exam engine ---
export const startAttemptSchema = z.object({ examId: z.string().min(1) });

export const autosaveAnswerSchema = z.object({
  questionId: z.string().min(1),
  // Response shape is type-specific (string, string[], or a map for matching/labelling).
  response: z.unknown(),
  isFlagged: z.boolean().optional()
});
export type AutosaveAnswerInput = z.infer<typeof autosaveAnswerSchema>;

export const heartbeatSchema = z.object({
  sectionAttemptId: z.string().min(1),
  audioPositionSec: z.number().nonnegative().optional()
});

// Live blueprint autosave — bounded so a candidate can't persist an arbitrarily
// large blob into the JSON column (the server-action body limit is 200MB).
export const MAX_ANSWER_KEYS = 500;
export const MAX_ANSWER_VALUE_LEN = 20000;
export const MAX_ANSWER_ARRAY_ITEMS = 40;

export const blueprintAnswerValueSchema = z.union([
  z.string().max(MAX_ANSWER_VALUE_LEN),
  z.array(z.string().max(500)).max(MAX_ANSWER_ARRAY_ITEMS),
  z.null()
]);

export const blueprintAnswersSchema = z
  .record(z.string().min(1).max(200), blueprintAnswerValueSchema)
  .refine((m) => Object.keys(m).length <= MAX_ANSWER_KEYS, {
    message: `too many answers (max ${MAX_ANSWER_KEYS})`
  });
export type BlueprintAnswers = z.infer<typeof blueprintAnswersSchema>;

export const MAX_ANNOTATIONS_BYTES = 1_000_000;

export const writingSubmissionSchema = z.object({
  taskNo: z.union([z.literal(1), z.literal(2)]),
  content: z.string().max(20000)
});

// --- Admin: writing evaluation ---
export const writingScoreSchema = z.object({
  submissionId: z.string().min(1),
  criteria: z.object({
    taskResponse: z.number().min(0).max(9),
    coherenceCohesion: z.number().min(0).max(9),
    lexicalResource: z.number().min(0).max(9),
    grammaticalRange: z.number().min(0).max(9)
  }),
  feedback: z.string().max(10000).optional()
});
export type WritingScoreInput = z.infer<typeof writingScoreSchema>;

// --- Admin: assignment (E3) ---
export const assignmentSchema = z.object({
  examId: z.string().min(1),
  targetType: z.enum(["CANDIDATE", "GROUP", "ORG"]),
  targetId: z.string().min(1).optional(),
  candidateIds: z.array(z.string()).optional(),
  windowStart: z.string().datetime().optional(),
  windowEnd: z.string().datetime().optional(),
  maxAttempts: z.number().int().positive().default(1)
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

// --- Exam import (JSON-driven exam builder) ---
export * from "./exam-import";

// --- Common ---
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  sort: z.string().optional()
});
export type PaginationInput = z.infer<typeof paginationSchema>;
