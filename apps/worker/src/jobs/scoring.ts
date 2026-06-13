import type { Job } from "bullmq";

/**
 * Automatic scoring processor (stub) for Listening & Reading.
 * Loads answer keys (server-only), scores responses, maps raw → band via the configured
 * conversion table, writes Score, and advances the attempt status. Writing stays manual.
 */
export async function processScoring(_job: Job): Promise<void> {
  throw new Error("Not implemented: objective scoring");
}
