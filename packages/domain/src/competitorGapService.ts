import { randomUUID } from 'crypto';
import {
  CompetitorGapRecommendation,
  GapType,
  GapActionTarget,
  CompetitorEvidenceProfile
} from '@localpilot/contracts';

export interface OwnerCanonicalPage {
  serviceKey: string;
  url: string;
  title: string;
}

export class CompetitorGapService {
  /**
   * Analyzes content and customer journey gaps against confirmed owner services.
   * Strictly avoids doorway pages, word-count ranking claims, and competitor plagiarism.
   */
  static analyzeGaps(params: {
    organizationId: string;
    locationId: string;
    ownerConfirmedServices: string[]; // e.g. ['emergency-roof-repair', 'hail-tarping', 'metal-roofing']
    ownerCanonicalPages: OwnerCanonicalPage[];
    competitorProfiles: CompetitorEvidenceProfile[];
  }): CompetitorGapRecommendation[] {
    const recommendations: CompetitorGapRecommendation[] = [];
    const ownerServiceMap = new Map(params.ownerCanonicalPages.map((p) => [p.serviceKey, p]));

    // Identify services competitors offer that the owner also confirms offering
    for (const profile of params.competitorProfiles) {
      for (const compService of profile.observedServices) {
        const normalizedServiceKey = compService.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // Only recommend gaps for services the owner actually confirmed offering!
        const ownerOffersService = params.ownerConfirmedServices.some(
          (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-') === normalizedServiceKey
        );

        if (!ownerOffersService) {
          continue; // Do not recommend services the business does not actually perform
        }

        const existingPage = ownerServiceMap.get(normalizedServiceKey);

        if (existingPage) {
          // Rule: Favor enhancing existing canonical page over creating duplicate doorway pages
          recommendations.push({
            id: randomUUID(),
            organizationId: params.organizationId,
            locationId: params.locationId,
            gapType: 'TOPIC_DEPTH_GAP',
            serviceKey: normalizedServiceKey,
            recommendationTitle: `Enhance existing canonical page: ${existingPage.title}`,
            actionTarget: 'ENHANCE_EXISTING_CANONICAL',
            existingCanonicalUrl: existingPage.url,
            evidenceSummary: `Competitor "${profile.businessName}" features dedicated proof and warranty details for ${compService}. You have an existing page at ${existingPage.url}.`,
            practicalCustomerBenefit: `Adding verified warranty options, certified installer credentials, and actual local job photography helps customers evaluate service quality without creating redundant town-specific doorway pages.`,
            avoidsWordCountCorrelationClaim: true,
            avoidsPlagiarizedCopy: true,
            createdAt: new Date().toISOString()
          });
        } else {
          // Missing confirmed service page
          recommendations.push({
            id: randomUUID(),
            organizationId: params.organizationId,
            locationId: params.locationId,
            gapType: 'MISSING_CONFIRMED_SERVICE_PAGE',
            serviceKey: normalizedServiceKey,
            recommendationTitle: `Create dedicated canonical service page for ${compService}`,
            actionTarget: 'CREATE_NEW_SERVICE_PAGE',
            evidenceSummary: `You confirmed offering "${compService}", but have no dedicated canonical URL. Competitor "${profile.businessName}" currently ranks with a dedicated page.`,
            practicalCustomerBenefit: `Provides prospective customers with clear information on your confirmed ${compService} procedures, response times, and booking steps.`,
            avoidsWordCountCorrelationClaim: true,
            avoidsPlagiarizedCopy: true,
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    // De-duplicate recommendations by serviceKey
    const seen = new Set<string>();
    return recommendations.filter((r) => {
      if (seen.has(r.serviceKey)) return false;
      seen.add(r.serviceKey);
      return true;
    });
  }
}
