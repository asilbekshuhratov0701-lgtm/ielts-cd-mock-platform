import type { Job } from "bullmq";

/** Transactional email + in-app notification fan-out processor (stub). */
export async function processEmail(_job: Job): Promise<void> {
  throw new Error("Not implemented: email/notification delivery");
}
