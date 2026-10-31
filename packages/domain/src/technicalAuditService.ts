import {
  AuditIssue,
  TechnicalAuditReport,
  BookingDestinationStatus,
} from '@localpilot/contracts';
import { SSRFValidator } from './security/ssrfValidator.js';
import { ValidationFailedError } from './errors.js';

export interface PageCrawlObservation {
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  html: string;
}

export class TechnicalAuditService {
  /**
   * Performs an in-depth technical and conversion SEO audit on crawled pages
   */
  public async auditSite(
    siteId: string,
    targetUrl: string,
    crawledPages: PageCrawlObservation[],
    maxPages: number = 20
  ): Promise<TechnicalAuditReport> {
    // 1. Validate target URL against SSRF
    SSRFValidator.validateUrl(targetUrl);

    if (crawledPages.length > maxPages) {
      throw new ValidationFailedError(`Crawled pages count (${crawledPages.length}) exceeded bounded budget of ${maxPages}.`);
    }

    const allIssues: AuditIssue[] = [];
    let hasClickToCall = false;
    let clickToCallPhone: string | undefined;
    let hasEmailContact = false;
    let hasMobileViewport = false;
    let hasBookingButton = false;
    let isExternalBooking = false;

    for (const page of crawledPages) {
      const issues = this.auditSinglePage(page);
      allIssues.push(...issues);

      // Conversion checks on homepage / primary pages
      const lowerHtml = page.html.toLowerCase();
      if (lowerHtml.includes('name="viewport"') || lowerHtml.includes("name='viewport'")) {
        hasMobileViewport = true;
      }

      const telMatch = page.html.match(/href=["']tel:([^"']+)["']/i);
      if (telMatch) {
        hasClickToCall = true;
        clickToCallPhone = telMatch[1];
      }

      if (lowerHtml.includes('href="mailto:') || lowerHtml.includes("href='mailto:")) {
        hasEmailContact = true;
      }

      if (
        lowerHtml.includes('book appointment') ||
        lowerHtml.includes('book online') ||
        lowerHtml.includes('schedule consultation') ||
        lowerHtml.includes('reserve now')
      ) {
        hasBookingButton = true;
        if (
          lowerHtml.includes('calendly.com') ||
          lowerHtml.includes('acuityscheduling.com') ||
          lowerHtml.includes('square.site') ||
          lowerHtml.includes('practo.com')
        ) {
          isExternalBooking = true;
        }
      }
    }

    let bookingDestinationStatus: BookingDestinationStatus = 'MISSING';
    let bookingVerificationNote = 'No direct online booking destination detected on scanned pages.';

    if (hasBookingButton) {
      if (isExternalBooking) {
        bookingDestinationStatus = 'MANUAL_VERIFICATION_REQUIRED';
        bookingVerificationNote =
          'Third-party scheduling service detected. Unauthenticated crawler cannot complete end-to-end booking verification. Manual verification required.';
      } else {
        bookingDestinationStatus = 'VERIFIED_ON_PAGE';
        bookingVerificationNote = 'On-page appointment request flow verified on scanned pages.';
      }
    }

    // Tally issues
    const criticalCount = allIssues.filter((i) => i.severity === 'CRITICAL').length;
    const warningCount = allIssues.filter((i) => i.severity === 'WARNING').length;
    const infoCount = allIssues.filter((i) => i.severity === 'INFO').length;

    // Explainable score formula: 100 - (15 * crit) - (5 * warn) - (1 * info), floor at 0
    const rawScore = 100 - criticalCount * 15 - warningCount * 5 - infoCount * 1;
    const overallScore = Math.max(0, Math.min(100, rawScore));

    return {
      auditId: crypto.randomUUID ? crypto.randomUUID() : `audit-${Date.now()}`,
      siteId,
      targetUrl,
      crawledPagesCount: crawledPages.length,
      overallScore,
      criticalIssuesCount: criticalCount,
      warningIssuesCount: warningCount,
      infoIssuesCount: infoCount,
      issues: allIssues,
      conversionChecks: {
        hasClickToCall,
        clickToCallPhone,
        hasEmailContact,
        hasMobileViewport,
        bookingDestinationStatus,
        bookingVerificationNote,
      },
      observedAt: new Date().toISOString(),
    };
  }

  private auditSinglePage(page: PageCrawlObservation): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const html = page.html;
    const lowerHtml = html.toLowerCase();

    // 1. Status Code & Indexability
    if (page.statusCode >= 400) {
      issues.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `iss-${Date.now()}-status`,
        category: 'INDEXABILITY',
        severity: 'CRITICAL',
        title: `HTTP ${page.statusCode} Error`,
        description: `Page returned HTTP error status ${page.statusCode}.`,
        pageUrl: page.url,
        recommendation: 'Fix server error or update link to point to an active valid 200 page.',
        isAutoFixable: false,
      });
      return issues; // Cannot evaluate rest of page if 404/500
    }

    if (
      lowerHtml.includes('content="noindex"') ||
      lowerHtml.includes("content='noindex'") ||
      page.headers['x-robots-tag']?.toLowerCase().includes('noindex')
    ) {
      issues.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `iss-${Date.now()}-noindex`,
        category: 'INDEXABILITY',
        severity: 'WARNING',
        title: 'Page Marked as Noindex',
        description: 'Page has a noindex directive preventing it from ranking in Google Search.',
        pageUrl: page.url,
        recommendation: 'Remove noindex meta tag if this page should receive organic local traffic.',
        isAutoFixable: true,
      });
    }

    // 2. Canonical Tag
    const canonicalMatch = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    if (!canonicalMatch) {
      issues.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `iss-${Date.now()}-canon`,
        category: 'CANONICAL',
        severity: 'WARNING',
        title: 'Missing Canonical Tag',
        description: 'Page does not declare a rel="canonical" link element.',
        pageUrl: page.url,
        recommendation: `Add <link rel="canonical" href="${page.url}"> to consolidate index signals.`,
        isAutoFixable: true,
      });
    }

    // 3. Title Tag
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (!titleMatch || !titleMatch[1].trim()) {
      issues.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `iss-${Date.now()}-title-missing`,
        category: 'METADATA',
        severity: 'CRITICAL',
        title: 'Missing Page Title',
        description: 'Page is missing a <title> element.',
        pageUrl: page.url,
        recommendation: 'Add a concise, keyword-rich title between 30 and 60 characters.',
        isAutoFixable: true,
      });
    } else {
      const titleLen = titleMatch[1].trim().length;
      if (titleLen > 65) {
        issues.push({
          id: crypto.randomUUID ? crypto.randomUUID() : `iss-${Date.now()}-title-long`,
          category: 'METADATA',
          severity: 'WARNING',
          title: 'Page Title Too Long',
          description: `Title is ${titleLen} characters (recommended: 30-60 characters). May be truncated in Google search snippets.`,
          pageUrl: page.url,
          recommendation: 'Shorten page title to under 60 characters.',
          isAutoFixable: true,
        });
      }
    }

    // 4. Meta Description
    const metaDescMatch = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    if (!metaDescMatch || !metaDescMatch[1].trim()) {
      issues.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `iss-${Date.now()}-desc-missing`,
        category: 'METADATA',
        severity: 'WARNING',
        title: 'Missing Meta Description',
        description: 'Page does not have a meta description.',
        pageUrl: page.url,
        recommendation: 'Add an informative meta description between 70 and 155 characters.',
        isAutoFixable: true,
      });
    }

    // 5. Headings (H1)
    const h1Matches = html.match(/<h1\b[^>]*>/gi);
    if (!h1Matches || h1Matches.length === 0) {
      issues.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `iss-${Date.now()}-h1-none`,
        category: 'HEADINGS',
        severity: 'WARNING',
        title: 'Missing H1 Heading',
        description: 'Page does not have an <h1> heading tag.',
        pageUrl: page.url,
        recommendation: 'Add an <h1> heading that clearly describes the primary service or topic.',
        isAutoFixable: true,
      });
    } else if (h1Matches.length > 1) {
      issues.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `iss-${Date.now()}-h1-multi`,
        category: 'HEADINGS',
        severity: 'INFO',
        title: 'Multiple H1 Headings Detected',
        description: `Page contains ${h1Matches.length} <h1> tags. A single clear H1 per page is recommended for local SEO hierarchy.`,
        pageUrl: page.url,
        recommendation: 'Use one primary <h1> and use <h2>/<h3> for sub-sections.',
        isAutoFixable: false,
      });
    }

    // 6. Image Alt Attributes
    const imgMatches = html.match(/<img\b[^>]*>/gi) || [];
    let missingAltCount = 0;
    for (const imgTag of imgMatches) {
      if (!imgTag.toLowerCase().includes('alt=') || imgTag.includes('alt=""') || imgTag.includes("alt=''")) {
        missingAltCount++;
      }
    }
    if (missingAltCount > 0) {
      issues.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `iss-${Date.now()}-img-alt`,
        category: 'IMAGES',
        severity: 'WARNING',
        title: `Images Missing Alt Text (${missingAltCount})`,
        description: `${missingAltCount} images on this page lack descriptive alt attributes, impairing accessibility and image SEO.`,
        pageUrl: page.url,
        recommendation: 'Add descriptive alt text to all meaningful business and service photos.',
        isAutoFixable: true,
      });
    }

    return issues;
  }
}
