import type { Job } from "bullmq";

/**
 * AI exam-import pipeline processor (stub).
 * Runs the hybrid pipeline: classify/unzip → rule-based parse → (OCR if scanned) →
 * Claude analysis (tool-use, chunked) → assemble draft → validate → NEEDS_REVIEW.
 * Never publishes — the admin review gate does that.
 */
export async function processImport(_job: Job): Promise<void> {
  throw new Error("Not implemented: AI import pipeline");
}
