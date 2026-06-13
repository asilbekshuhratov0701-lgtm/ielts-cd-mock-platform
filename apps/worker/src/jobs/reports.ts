import type { Job } from "bullmq";

/** Report generation processor (stub) — PDF/Excel candidate & exam reports. */
export async function processReports(_job: Job): Promise<void> {
  throw new Error("Not implemented: report generation");
}
