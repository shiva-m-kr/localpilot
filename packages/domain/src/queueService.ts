import crypto from 'crypto';
import {
  EnqueueJobInput,
  JobRecord,
  JobLane,
  JobStatus,
  JobDiagnostics
} from '@localpilot/contracts';
import { ValidationFailedError, BaseDomainError } from './errors.js';

export interface LeaseOptions {
  workerId: string;
  lane: JobLane;
  leaseDurationMs?: number;
  maxPerTenantConcurrency?: number;
}

export class QueueService {
  private static jobs = new Map<string, JobRecord>();
  private static defaultLeaseDurationMs = 30_000; // 30 seconds
  private static defaultMaxPerTenant = 2; // Tenant fair-share throttling

  static clear(): void {
    this.jobs.clear();
  }

  /**
   * Enqueues a new background job into a specific lane.
   */
  static enqueue(input: EnqueueJobInput): JobRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const job: JobRecord = {
      id,
      organizationId: input.organizationId,
      locationId: input.locationId,
      lane: input.lane,
      jobType: input.jobType,
      priority: input.priority || 'normal',
      status: 'queued',
      payload: input.payload,
      maxAttempts: input.maxAttempts || 3,
      attemptCount: 0,
      runAt: input.runAt || now,
      createdAt: now,
      updatedAt: now
    };

    this.jobs.set(id, job);
    return job;
  }

  /**
   * Reclaims expired leases (e.g. after a worker crash or missed heartbeat).
   * Resumes queued work automatically.
   */
  static reclaimExpiredLeases(): number {
    const now = Date.now();
    let reclaimedCount = 0;

    for (const job of this.jobs.values()) {
      if (
        (job.status === 'leased' || job.status === 'running') &&
        job.leaseExpiresAt &&
        new Date(job.leaseExpiresAt).getTime() < now
      ) {
        // Expired lease found! Reset to queued so another worker or restarted worker can pick it up
        job.status = 'queued';
        job.workerId = undefined;
        job.leasedAt = undefined;
        job.leaseExpiresAt = undefined;
        job.updatedAt = new Date().toISOString();
        reclaimedCount++;
      }
    }

    return reclaimedCount;
  }

  /**
   * Acquires the next available job lease for a worker with tenant fair-share throttling.
   */
  static acquireNextJob(options: LeaseOptions): JobRecord | null {
    this.reclaimExpiredLeases();

    const now = Date.now();
    const leaseDuration = options.leaseDurationMs || this.defaultLeaseDurationMs;
    const maxPerTenant = options.maxPerTenantConcurrency || this.defaultMaxPerTenant;

    // Count currently active/leased jobs per tenant in this lane
    const activePerTenant = new Map<string, number>();
    for (const job of this.jobs.values()) {
      if (job.lane === options.lane && (job.status === 'leased' || job.status === 'running')) {
        const count = activePerTenant.get(job.organizationId) || 0;
        activePerTenant.set(job.organizationId, count + 1);
      }
    }

    // Find candidate jobs in this lane that are ready to run
    const candidates = Array.from(this.jobs.values()).filter(
      (job) =>
        job.lane === options.lane &&
        job.status === 'queued' &&
        new Date(job.runAt).getTime() <= now
    );

    // Sort by priority (critical > high > normal > low) then creation time
    const priorityWeight: Record<string, number> = { critical: 4, high: 3, normal: 2, low: 1 };
    candidates.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
      if (pDiff !== 0) return pDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    for (const candidate of candidates) {
      const tenantActive = activePerTenant.get(candidate.organizationId) || 0;
      if (tenantActive >= maxPerTenant) {
        // Tenant reached concurrency limit in this lane - skip to prevent starvation of other tenants
        continue;
      }

      // Lease this job to the worker
      const leasedAt = new Date().toISOString();
      const leaseExpiresAt = new Date(now + leaseDuration).toISOString();

      candidate.status = 'leased';
      candidate.workerId = options.workerId;
      candidate.leasedAt = leasedAt;
      candidate.leaseExpiresAt = leaseExpiresAt;
      candidate.lastHeartbeatAt = leasedAt;
      candidate.attemptCount += 1;
      candidate.updatedAt = leasedAt;

      return candidate;
    }

    return null;
  }

  /**
   * Worker sends heartbeat to extend the lease while processing.
   */
  static heartbeat(jobId: string, workerId: string, extensionMs: number = 30_000): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new ValidationFailedError(`Job ${jobId} not found.`);
    }

    if (job.workerId !== workerId || (job.status !== 'leased' && job.status !== 'running')) {
      throw new ValidationFailedError(`Cannot heartbeat job ${jobId}: invalid worker lease.`);
    }

    const now = Date.now();
    job.status = 'running';
    job.lastHeartbeatAt = new Date(now).toISOString();
    job.leaseExpiresAt = new Date(now + extensionMs).toISOString();
    job.updatedAt = new Date(now).toISOString();
  }

  /**
   * Completes a job successfully.
   */
  static completeJob(jobId: string, workerId: string): JobRecord {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new ValidationFailedError(`Job ${jobId} not found.`);
    }

    if (job.workerId !== workerId) {
      throw new ValidationFailedError(`Worker ${workerId} does not hold active lease for ${jobId}.`);
    }

    const now = new Date().toISOString();
    job.status = 'completed';
    job.completedAt = now;
    job.updatedAt = now;
    job.leaseExpiresAt = undefined;

    return job;
  }

  /**
   * Marks a job as failed, sanitizing error details to prevent leaking secrets.
   */
  static failJob(jobId: string, workerId: string, error: Error | unknown): JobRecord {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new ValidationFailedError(`Job ${jobId} not found.`);
    }

    const now = new Date().toISOString();
    const rawMessage = error instanceof Error ? error.message : String(error);
    const sanitizedMessage = this.sanitizeErrorMessage(rawMessage);

    const diagnostics: JobDiagnostics = {
      errorCode: error instanceof BaseDomainError ? error.code : 'JOB_EXECUTION_FAILURE',
      errorMessage: sanitizedMessage,
      userAction: error instanceof BaseDomainError ? error.userAction : undefined,
      failedAt: now,
      isSanitized: true,
      attemptsMade: job.attemptCount
    };

    job.diagnostics = diagnostics;
    job.updatedAt = now;
    job.leaseExpiresAt = undefined;

    if (job.attemptCount >= job.maxAttempts) {
      job.status = 'failed';
    } else {
      // Re-queue for retry with backoff
      job.status = 'queued';
      job.workerId = undefined;
      job.leasedAt = undefined;
      // Exponential backoff: 2s, 4s, 8s...
      const backoffSec = Math.pow(2, job.attemptCount);
      job.runAt = new Date(Date.now() + backoffSec * 1000).toISOString();
    }

    return job;
  }

  /**
   * Retrieves a job by ID.
   */
  static getJob(jobId: string): JobRecord | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Redacts sensitive patterns (tokens, passwords, api keys, bearer headers) from error messages.
   */
  private static sanitizeErrorMessage(message: string): string {
    return message
      .replace(/(?:bearer\s+|token[=:]\s*|key[=:]\s*|password[=:]\s*|secret[=:]\s*)[a-zA-Z0-9_\-\.]{8,}/gi, '[REDACTED_SECRET]')
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GOOGLE_API_KEY]')
      .replace(/ghp_[0-9a-zA-Z]{36}/g, '[REDACTED_GITHUB_TOKEN]');
  }
}
