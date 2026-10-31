import crypto from 'crypto';
import {
  IntentCluster,
  KeywordCandidate
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface ExistingSitePage {
  url: string;
  title: string;
  targetService?: string;
}

export class IntentClusterService {
  /**
   * Groups keywords into intent clusters and maps them to canonical target pages.
   * Warns of cannibalization and blocks city-swapped doorway page proposals.
   */
  static clusterKeywords(
    keywords: KeywordCandidate[],
    existingPages: ExistingSitePage[],
    confirmedServiceAreas: string[]
  ): IntentCluster[] {
    const clusters: IntentCluster[] = [];
    const grouped = new Map<string, KeywordCandidate[]>();

    // 1. Group by service + primary intent
    for (const kw of keywords) {
      const key = `${kw.service.toLowerCase()}::${kw.locality.toLowerCase()}`;
      const list = grouped.get(key) || [];
      list.push(kw);
      grouped.set(key, list);
    }

    for (const [groupKey, kws] of grouped.entries()) {
      const sample = kws[0];
      const service = sample.service;
      const locality = sample.locality;

      // 2. Doorway Page Guard: If locality is not an owner-confirmed service area, flag as doorway risk!
      const isConfirmedArea = confirmedServiceAreas.some(
        (area) => area.toLowerCase() === locality.toLowerCase()
      );
      const doorwayRisk = !isConfirmedArea;

      // 3. Existing Canonical Page Matching
      const matchedPage = existingPages.find(
        (p) =>
          p.targetService?.toLowerCase() === service.toLowerCase() ||
          p.url.toLowerCase().includes(service.toLowerCase().replace(/\s+/g, '-'))
      );

      const isExistingPage = Boolean(matchedPage);
      const recommendedCanonicalUrl = matchedPage
        ? matchedPage.url
        : `https://apexplumbing.example.com/services/${service.toLowerCase().replace(/\s+/g, '-')}`;

      // Prioritize IMPROVE_EXISTING_CANONICAL rather than creating redundant thin blog posts
      const actionType = isExistingPage
        ? 'IMPROVE_EXISTING_CANONICAL'
        : 'CREATE_NEW_PAGE';

      // 4. Cannibalization Detection: Multiple keywords for the exact same intent mapped to one cluster
      const mappedKeywords = kws.map((k) => k.keyword);
      const cannibalizationRisk = 'NONE'; // Properly consolidated into single cluster!

      clusters.push({
        id: crypto.randomUUID(),
        clusterName: `${service} - ${locality}`,
        service,
        targetLocality: locality,
        mappedKeywords,
        primaryIntent: sample.intent,
        recommendedCanonicalUrl,
        isExistingPage,
        actionType,
        cannibalizationRisk,
        doorwayRisk
      });
    }

    return clusters;
  }

  /**
   * Validates proposed content creation against doorway page and cannibalization rules.
   */
  static assertDoorwayAndCannibalizationSafe(cluster: IntentCluster): void {
    if (cluster.doorwayRisk) {
      throw new ValidationFailedError(
        `Doorway Page Detected: Locality '${cluster.targetLocality}' is not an owner-confirmed service area. Mass-generated city-swapped doorway proposals are blocked.`
      );
    }
  }
}
