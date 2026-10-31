import { getEnv } from '@localpilot/config';
import { QueueService } from '@localpilot/domain';
import { startWorkerHealthServer } from './health.js';

const WORKER_ID = `worker-${process.pid}-${Date.now()}`;

async function main() {
  const env = getEnv();
  console.log(`[Worker ${WORKER_ID}] Starting LocalPilot background worker in ${env.NODE_ENV} mode...`);
  
  const server = startWorkerHealthServer(env.WORKER_PORT);
  let isRunning = true;

  // Background worker loop across 5 lanes: publication, reconciliation, generation, rankings, crawl_maintenance
  const lanes = ['publication', 'reconciliation', 'generation', 'rankings', 'crawl_maintenance'] as const;

  const processNextJobs = async () => {
    if (!isRunning) return;

    for (const lane of lanes) {
      try {
        const job = QueueService.acquireNextJob({
          workerId: WORKER_ID,
          lane,
          leaseDurationMs: 15_000,
          maxPerTenantConcurrency: 2
        });

        if (job) {
          console.log(`[Worker ${WORKER_ID}] Processing job ${job.id} on lane '${lane}' (${job.jobType})`);
          // Heartbeat simulation
          QueueService.heartbeat(job.id, WORKER_ID);
          // Complete job
          QueueService.completeJob(job.id, WORKER_ID);
          console.log(`[Worker ${WORKER_ID}] Successfully completed job ${job.id}`);
        }
      } catch (err) {
        console.error(`[Worker ${WORKER_ID}] Error in worker loop on lane ${lane}:`, err);
      }
    }
  };

  const intervalId = setInterval(processNextJobs, 1000);

  const shutdown = () => {
    console.log(`[Worker ${WORKER_ID}] Graceful shutdown initiated...`);
    isRunning = false;
    clearInterval(intervalId);
    server.close(() => {
      console.log(`[Worker ${WORKER_ID}] Health server closed.`);
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[Worker] Fatal error during startup:', err);
  process.exit(1);
});
