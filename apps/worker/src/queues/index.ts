import { Queue } from "bullmq";
import { connection } from "../redis";

/** Canonical queue names shared by producers (web) and consumers (worker). */
export const QUEUE_NAMES = {
  import: "ai-import",
  scoring: "scoring",
  email: "email",
  reports: "reports",
  analytics: "analytics",
  maintenance: "maintenance"
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Lazily-created, memoized Queue handles. Queues are NOT constructed at import time so
 * merely importing this module never opens a Redis connection (important for the web
 * producer and for connection-free smoke tests).
 */
const cache = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  let queue = cache.get(name);
  if (!queue) {
    queue = new Queue(name, { connection });
    cache.set(name, queue);
  }
  return queue;
}
