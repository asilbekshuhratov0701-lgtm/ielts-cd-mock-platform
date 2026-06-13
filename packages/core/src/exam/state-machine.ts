/**
 * Exam/content state machines (stubs + transition maps).
 * The transition tables are declarative data; the guard functions are stubs.
 */
import type { AttemptStatus, ContentStatus } from "../types";

/** Universal Draft -> Review -> Publish workflow (E4). Allowed forward transitions. */
export const CONTENT_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ["IN_REVIEW", "ARCHIVED"],
  IN_REVIEW: ["PREVIEW", "DRAFT", "ARCHIVED"],
  PREVIEW: ["APPROVED", "IN_REVIEW"],
  APPROVED: ["PUBLISHED", "DRAFT"],
  PUBLISHED: ["ASSIGNED", "ARCHIVED"],
  ASSIGNED: ["ARCHIVED"],
  ARCHIVED: []
};

export const ATTEMPT_TRANSITIONS: Record<AttemptStatus, AttemptStatus[]> = {
  NOT_STARTED: ["IN_PROGRESS", "ABANDONED"],
  IN_PROGRESS: ["SUBMITTED", "EXPIRED", "ABANDONED"],
  SUBMITTED: ["GRADED"],
  GRADED: ["PUBLISHED"],
  PUBLISHED: [],
  EXPIRED: ["GRADED"],
  ABANDONED: []
};

export function canTransitionContent(from: ContentStatus, to: ContentStatus): boolean {
  return CONTENT_TRANSITIONS[from].includes(to);
}

export function canTransitionAttempt(from: AttemptStatus, to: AttemptStatus): boolean {
  return ATTEMPT_TRANSITIONS[from].includes(to);
}
