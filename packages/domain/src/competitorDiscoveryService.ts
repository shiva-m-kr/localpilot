import { randomUUID } from 'crypto';
import {
  CompetitorEntity,
  CompetitorClassification,
  CompetitorSourceType,
  CompetitorSet
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class CompetitorDiscoveryService {
  private static competitorSets = new Map<string, CompetitorSet>();

  private static readonly KNOWN_DIRECTORIES = new Set([
    'yelp.com',
    'angi.com',
    'homeadvisor.com',
    'thumbtack.com',
    'bbb.org',
    'yellowpages.com',
    'wikipedia.org',
    'forbes.com',
    'houzz.com',
    'mapquest.com'
  ]);

  static reset(): void {
    this.competitorSets.clear();
  }

  /**
   * Classifies domain into local competitor vs national directory or aggregator.
   */
  static classifyDomain(domain?: string): CompetitorClassification {
    if (!domain) return 'LOCAL_SERVICE_COMPETITOR';
    const cleanDomain = domain.toLowerCase().replace(/^www\./, '');

    for (const dir of this.KNOWN_DIRECTORIES) {
      if (cleanDomain === dir || cleanDomain.endsWith(`.${dir}`)) {
        return 'NATIONAL_DIRECTORY';
      }
    }

    if (cleanDomain.includes('directory') || cleanDomain.includes('find-a-pro')) {
      return 'AGGREGATOR';
    }

    return 'LOCAL_SERVICE_COMPETITOR';
  }

  /**
   * Initializes or fetches competitor set for location.
   */
  static getOrCreateSet(params: {
    organizationId: string;
    locationId: string;
    latitude: number;
    longitude: number;
    radiusKm: number;
  }): CompetitorSet {
    const existing = this.competitorSets.get(params.locationId);
    if (existing) return existing;

    const set: CompetitorSet = {
      setId: randomUUID(),
      organizationId: params.organizationId,
      locationId: params.locationId,
      geographicCenter: {
        latitude: params.latitude,
        longitude: params.longitude,
        radiusKm: params.radiusKm
      },
      competitors: [],
      updatedAt: new Date().toISOString()
    };

    this.competitorSets.set(params.locationId, set);
    return set;
  }

  /**
   * Ingests SERP-observed competitor candidates.
   * Enforces that similar names DO NOT auto-merge if Place IDs or domains differ.
   */
  static ingestSerpObservations(params: {
    locationId: string;
    queryClusterId?: string;
    candidates: Array<{
      businessName: string;
      placeId?: string;
      domain?: string;
    }>;
  }): CompetitorEntity[] {
    const set = this.competitorSets.get(params.locationId);
    if (!set) {
      throw new ValidationFailedError(`Competitor set for location ${params.locationId} not found.`);
    }

    const updatedCompetitors = [...set.competitors];
    const nowIso = new Date().toISOString();

    for (const cand of params.candidates) {
      const classification = this.classifyDomain(cand.domain);

      // Strict matching: Only match if EXACT placeId matches OR exact domain matches
      const existingIndex = updatedCompetitors.findIndex((c) => {
        if (cand.placeId && c.placeId && cand.placeId === c.placeId) return true;
        if (cand.domain && c.domain && cand.domain.toLowerCase() === c.domain.toLowerCase()) return true;
        return false;
      });

      if (existingIndex >= 0) {
        // Increment observation frequency
        const existing = updatedCompetitors[existingIndex];
        const clusters = params.queryClusterId && !existing.queryClusterIds.includes(params.queryClusterId)
          ? [...existing.queryClusterIds, params.queryClusterId]
          : existing.queryClusterIds;

        updatedCompetitors[existingIndex] = {
          ...existing,
          observedFrequency: existing.observedFrequency + 1,
          queryClusterIds: clusters,
          lastObservedAt: nowIso
        };
      } else {
        // Create new competitor entity (Similar names NOT auto-merged!)
        const entity: CompetitorEntity = {
          id: randomUUID(),
          organizationId: set.organizationId,
          locationId: params.locationId,
          businessName: cand.businessName,
          placeId: cand.placeId,
          domain: cand.domain,
          classification,
          sourceType: 'SERP_DISCOVERED',
          isConfirmedByOwner: false,
          isExcluded: false,
          queryClusterIds: params.queryClusterId ? [params.queryClusterId] : [],
          observedFrequency: 1,
          lastObservedAt: nowIso
        };
        updatedCompetitors.push(entity);
      }
    }

    set.competitors = updatedCompetitors;
    set.updatedAt = nowIso;
    this.competitorSets.set(params.locationId, set);
    return updatedCompetitors;
  }

  /**
   * Adds an owner-supplied competitor.
   */
  static addOwnerSuppliedCompetitor(params: {
    locationId: string;
    businessName: string;
    domain?: string;
    placeId?: string;
  }): CompetitorEntity {
    const set = this.competitorSets.get(params.locationId);
    if (!set) {
      throw new ValidationFailedError(`Competitor set for location ${params.locationId} not found.`);
    }

    const classification = this.classifyDomain(params.domain);
    const entity: CompetitorEntity = {
      id: randomUUID(),
      organizationId: set.organizationId,
      locationId: params.locationId,
      businessName: params.businessName,
      placeId: params.placeId,
      domain: params.domain,
      classification,
      sourceType: 'OWNER_SUPPLIED',
      isConfirmedByOwner: true,
      isExcluded: false,
      queryClusterIds: [],
      observedFrequency: 1,
      lastObservedAt: new Date().toISOString()
    };

    set.competitors.push(entity);
    set.updatedAt = new Date().toISOString();
    return entity;
  }

  /**
   * Excludes a non-competitor entity.
   */
  static excludeCompetitor(locationId: string, competitorId: string): void {
    const set = this.competitorSets.get(locationId);
    if (!set) throw new ValidationFailedError(`Set for location ${locationId} not found.`);

    const target = set.competitors.find((c) => c.id === competitorId);
    if (target) {
      target.isExcluded = true;
      set.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Returns active local competitors (excluding national directories and owner-excluded entries).
   */
  static getActiveLocalCompetitors(locationId: string): CompetitorEntity[] {
    const set = this.competitorSets.get(locationId);
    if (!set) return [];
    return set.competitors.filter(
      (c) => !c.isExcluded && c.classification === 'LOCAL_SERVICE_COMPETITOR'
    );
  }
}
