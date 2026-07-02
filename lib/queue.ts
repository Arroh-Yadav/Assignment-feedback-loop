import { Queue } from "bullmq";
import { Redis } from "ioredis";

// ── Redis connection ──────────────────────────
// Upstash Redis over TLS. `maxRetriesPerRequest: null` is required by BullMQ
// (it manages its own retry/backoff logic on top of ioredis).
function createRedisConnection() {
  return new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

const globalForQueue = globalThis as unknown as {
  redisConnection: Redis | undefined;
  submissionQueue: Queue | undefined;
};

const connection = globalForQueue.redisConnection ?? createRedisConnection();

export const submissionQueue =
  globalForQueue.submissionQueue ??
  new Queue("submission-processing", { connection });

if (process.env.NODE_ENV !== "production") {
  globalForQueue.redisConnection = connection;
  globalForQueue.submissionQueue = submissionQueue;
}

// ── Public API ────────────────────────────────

/**
 * Enqueues a submission for AI processing. Fast, non-blocking — the actual
 * Gemini call happens later when /api/cron/process-queue is triggered by
 * Upstash QStash (see worker/process.ts).
 *
 * Retries: up to 3 attempts with exponential backoff, handled by the
 * worker's job options (set at add-time here since BullMQ ties retry
 * config to the job, not the worker).
 */
export async function addSubmissionJob(submissionId: string): Promise<void> {
  await submissionQueue.add(
    "process-submission",
    { submissionId },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: { age: 60 * 60 * 24 }, // keep completed jobs 24h for debugging
      removeOnFail: { age: 60 * 60 * 24 * 7 }, // keep failed jobs 7d for debugging
    },
  );
}
