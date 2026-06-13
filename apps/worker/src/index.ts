import { Worker, type Processor } from "bullmq";
import { connection } from "./redis";
import { QUEUE_NAMES, getQueue } from "./queues";
import { processImport } from "./jobs/import";
import { processScoring } from "./jobs/scoring";
import { processEmail } from "./jobs/email";
import { processReports } from "./jobs/reports";
import { processAnalytics } from "./jobs/analytics";
import { finalizeExpiredSessions } from "./cron/finalize";

const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 4);

function registerWorkers(): Worker[] {
  const defs: Array<[string, Processor]> = [
    [QUEUE_NAMES.import, processImport],
    [QUEUE_NAMES.scoring, processScoring],
    [QUEUE_NAMES.email, processEmail],
    [QUEUE_NAMES.reports, processReports],
    [QUEUE_NAMES.analytics, processAnalytics],
    [
      QUEUE_NAMES.maintenance,
      async (job) => {
        if (job.name === "finalize-expired-sessions") {
          await finalizeExpiredSessions();
        }
      }
    ]
  ];
  return defs.map(([name, processor]) => new Worker(name, processor, { connection, concurrency }));
}

async function scheduleCron(): Promise<void> {
  // Repeatable job driving server-authoritative auto-submit of expired exam sessions.
  await getQueue(QUEUE_NAMES.maintenance).add(
    "finalize-expired-sessions",
    {},
    {
      repeat: { pattern: process.env.FINALIZE_CRON ?? "*/1 * * * *" },
      removeOnComplete: true,
      removeOnFail: 100
    }
  );
}

async function main(): Promise<void> {
  const queueNames = Object.values(QUEUE_NAMES);
  console.info(`[worker] queues: ${queueNames.join(", ")}`);

  // Allows a connection-free smoke test: `WORKER_DRY_RUN=1 tsx src/index.ts`.
  if (process.env.WORKER_DRY_RUN === "1") {
    console.info("[worker] DRY_RUN — configuration registered, not connecting to Redis.");
    return;
  }

  const workers = registerWorkers();
  await scheduleCron();
  console.info(`[worker] started ${workers.length} workers (concurrency=${concurrency}).`);

  const shutdown = async (): Promise<void> => {
    console.info("[worker] shutting down...");
    await Promise.all(workers.map((w) => w.close()));
    await connection.quit();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
