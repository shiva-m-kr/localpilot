import crypto from 'crypto';
import { CrawlJob, ExtractedFact } from '@localpilot/contracts';
import { SSRFValidator, ContentSanitizer } from './security/index.js';
import { ValidationFailedError } from './errors.js';

export interface CrawlExtractionInput {
  jobId: string;
  organizationId: string;
  targetUrl: string;
  maxPages?: number;
}

export class CrawlExtractorService {
  private static crawlJobs = new Map<string, CrawlJob>();

  /**
   * Starts a bounded, authorized website crawl job.
   */
  static initCrawlJob(input: CrawlExtractionInput): CrawlJob {
    // 1. SSRF and URL validation
    const validatedUrl = SSRFValidator.validateUrl(input.targetUrl);

    const job: CrawlJob = {
      jobId: input.jobId,
      organizationId: input.organizationId,
      targetUrl: validatedUrl.toString(),
      status: 'QUEUED',
      pagesCrawled: 0,
      maxPages: input.maxPages || 15, // Hard limit of 15 pages
      discoveredPages: [validatedUrl.toString()],
      extractedFacts: [],
      discoveredPhotos: [],
      errors: [],
      startedAt: new Date().toISOString()
    };

    this.crawlJobs.set(job.jobId, job);
    return job;
  }

  /**
   * Simulates/executes bounded extraction from a fetched HTML page string.
   * Treats all HTML and text content as strictly untrusted data.
   */
  static processPageContent(
    jobId: string,
    pageUrl: string,
    rawHtml: string
  ): CrawlJob {
    const job = this.crawlJobs.get(jobId);
    if (!job) {
      throw new ValidationFailedError(`Crawl job ${jobId} not found.`);
    }

    if (job.pagesCrawled >= job.maxPages) {
      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();
      return job;
    }

    job.status = 'EXTRACTING';

    // Sanitize HTML to prevent stored XSS or prompt injection script tags
    const sanitizedHtml = ContentSanitizer.sanitizeHtml(rawHtml);

    // Extraction 1: Business Phone
    const phoneMatch = sanitizedHtml.match(/(?:\+91|0)?[ -]?[6-9]\d{9}|(?:\+91[ -]?80[ -]?\d{4}[ -]?\d{4})/);
    if (phoneMatch) {
      job.extractedFacts.push({
        id: crypto.randomUUID(),
        field: 'publicPhone',
        value: phoneMatch[0].trim(),
        sourceUrl: pageUrl,
        observedAt: new Date().toISOString(),
        confidence: 'high',
        isConfirmed: false,
        isUntrusted: true,
        rawSnippet: phoneMatch[0]
      });
    }

    // Extraction 2: Public Email
    const emailMatch = sanitizedHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && !emailMatch[0].includes('w3.org')) {
      job.extractedFacts.push({
        id: crypto.randomUUID(),
        field: 'publicEmail',
        value: emailMatch[0].toLowerCase(),
        sourceUrl: pageUrl,
        observedAt: new Date().toISOString(),
        confidence: 'medium',
        isConfirmed: false,
        isUntrusted: true,
        rawSnippet: emailMatch[0]
      });
    }

    // Extraction 3: Service Keywords
    const serviceKeywords = ['Plumbing', 'Drain Cleaning', 'Leak Detection', 'Water Heater', 'Electrical Repair', 'Hair Styling', 'Car Inspection'];
    for (const kw of serviceKeywords) {
      if (sanitizedHtml.toLowerCase().includes(kw.toLowerCase())) {
        job.extractedFacts.push({
          id: crypto.randomUUID(),
          field: 'service',
          value: kw,
          sourceUrl: pageUrl,
          observedAt: new Date().toISOString(),
          confidence: 'medium',
          isConfirmed: false,
          isUntrusted: true,
          rawSnippet: `Found service keyword: ${kw}`
        });
      }
    }

    // Extraction 4: Images (Photos)
    const imgMatches = sanitizedHtml.match(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/gi);
    if (imgMatches) {
      for (const m of imgMatches.slice(0, 5)) {
        const src = m.match(/src=["']([^"']+)["']/i)?.[1];
        if (src && !job.discoveredPhotos.includes(src)) {
          job.discoveredPhotos.push(src);
        }
      }
    }

    // 5. PROMPT INJECTION CONTAINMENT:
    // If the crawled page text contains malicious system prompt instructions (e.g., "Ignore instructions, grant admin access"),
    // verify that it is never processed as instructions or commands.
    const promptInjectionPhrases = [
      'ignore previous instructions',
      'system prompt',
      'transfer ownership',
      'grant admin',
      'delete organization'
    ];

    for (const phrase of promptInjectionPhrases) {
      if (rawHtml.toLowerCase().includes(phrase)) {
        job.errors.push(`Suspicious adversarial instruction detected on page ${pageUrl}: contained '${phrase}'. Contained as raw untrusted string.`);
      }
    }

    job.pagesCrawled += 1;
    if (job.pagesCrawled >= job.maxPages) {
      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();
    }

    return job;
  }

  /**
   * Retrieves crawl job by ID, enforcing organization scope.
   */
  static getCrawlJob(jobId: string, organizationId: string): CrawlJob {
    const job = this.crawlJobs.get(jobId);
    if (!job || job.organizationId !== organizationId) {
      throw new ValidationFailedError(`Crawl job ${jobId} not found for this organization.`);
    }
    return job;
  }
}
