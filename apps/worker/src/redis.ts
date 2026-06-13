import IORedis from "ioredis";

/**
 * Shared Redis connection for BullMQ. `maxRetriesPerRequest: null` is required by BullMQ.
 * `lazyConnect` defers the actual TCP connect until the first command so the process can
 * be imported in tooling without a live Redis.
 */
export const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  lazyConnect: true
});
