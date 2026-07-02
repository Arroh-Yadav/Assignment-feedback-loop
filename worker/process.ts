import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { processSubmission } from "@/lib/gemini";

// Note: processSubmission() (lib/gemini.ts) already sets the submission's
// status to AI_ERROR itself whenever it throws -- including on the final
// BullMQ attempt. So there's no separate "sweep exhausted jobs" step needed
// here; the status is set correctly (if briefly optimistic mid-retry) after
// every attempt, not just the last one.

// ── Serverless adaptation note ────────────────
// Implementation-Plan.md's Task 3.2 describes a long-running BullMQ Worker
// process. That doesn't exist on Vercel (serverless, no persistent process).
// Instead, this file exports `runQueueOnce()`, which is invoked per-request
// by app/api/cron/process-queue/route.ts, itself triggered on a schedule by
// Upstash QStash (since Vercel's own Cron feature is Hobby-plan-limited to
// once/day). The worker starts with `autorun: false`, processes whatever is
// currently waiting in the queue, and closes itself once drained — the
// documented BullMQ pattern for run-once/serverless usage.

const MAX_RUNTIME_MS = 55_000; // stay under typical serverless function timeouts

export interface QueueRunResult {
  processed: number;
  failed: number;
  timedOut: boolean;
}

export async function runQueueOnce(): Promise<QueueRunResult> {
  const connection = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  let processed = 0;
  let failed = 0;
  let timedOut = false;

  const worker = new Worker(
    "submission-processing",
    async (job: Job<{ submissionId: string }>) => {
      const { submissionId } = job.data;
      await processSubmission(submissionId);
    },
    { connection, concurrency: 5, autorun: false },
  );

  const result = await new Promise<QueueRunResult>((resolve) => {
    const timeout = setTimeout(() => {
      timedOut = true;
      resolve({ processed, failed, timedOut });
    }, MAX_RUNTIME_MS);

    worker.on("completed", (job) => {
      processed += 1;
      console.log(
        `Job ${job.id} completed — submission ${job.data?.submissionId} processed successfully`,
      );
    });

    worker.on("failed", (job, err) => {
      failed += 1;
      console.error(
        `Job ${job?.id} (submission ${job?.data?.submissionId}) failed:`,
        err,
      );
    });

    worker.on("drained", () => {
      clearTimeout(timeout);
      resolve({ processed, failed, timedOut });
    });

    worker.on("error", (err) => {
      console.error("Worker error:", err);
    });

    worker.run();
  });

  await worker.close();
  await connection.quit();

  return result;
}
