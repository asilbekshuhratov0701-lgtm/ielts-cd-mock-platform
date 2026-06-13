import type { Job } from "bullmq";

/** Analytics aggregation processor (stub) — rolls up trends, distributions, completion. */
export async function processAnalytics(_job: Job): Promise<void> {
  throw new Error("Not implemented: analytics aggregation");
}
