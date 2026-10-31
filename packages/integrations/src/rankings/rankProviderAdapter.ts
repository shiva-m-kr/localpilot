import { randomUUID } from 'crypto';
import {
  RankQueryRequest,
  RankObservationResult,
  SearchSurface
} from '@localpilot/contracts';

export interface ProviderSerpItem {
  type: string;
  rank_group: number;
  rank_absolute: number;
  title: string;
  place_id?: string;
  cid?: string;
  domain?: string;
}

export class RankProviderAdapter {
  private static readonly MAPS_COST_MICROS = 2000; // $0.002 per task
  private static readonly ORGANIC_COST_MICROS = 2500; // $0.0025 per task

  /**
   * Executes a minimal authorized rank check spike.
   * Enforces surface isolation and stable identity matching.
   */
  async executeRankSpike(req: RankQueryRequest): Promise<RankObservationResult> {
    // 1. Coordinate Validation
    if (req.latitude < -90 || req.latitude > 90 || req.longitude < -180 || req.longitude > 180) {
      return {
        taskId: `err-${randomUUID().slice(0, 8)}`,
        surface: req.surface,
        device: req.device,
        rank: null,
        found: false,
        actualCostMicros: 0,
        isAmbiguousMatch: false,
        confirmationRequired: false,
        taskError: `Invalid coordinates: (${req.latitude}, ${req.longitude}). Must be within valid geographical limits.`,
        observedAt: new Date().toISOString()
      };
    }

    const taskId = `task-${randomUUID().slice(0, 8)}`;
    const cost = req.surface === 'GOOGLE_MAPS' ? RankProviderAdapter.MAPS_COST_MICROS : RankProviderAdapter.ORGANIC_COST_MICROS;

    // 2. Simulated SERP response from licensed ranking provider
    const sampleItems: ProviderSerpItem[] = [
      {
        type: 'maps_search',
        rank_group: 1,
        rank_absolute: 1,
        title: 'Austin Premier Roofing Co',
        place_id: 'ChIJ_abc123',
        cid: '1234567890123'
      },
      {
        type: 'maps_search',
        rank_group: 2,
        rank_absolute: 2,
        title: 'Apex Roofing & Restoration (North Austin)',
        place_id: 'ChIJ_apex_north_99',
        cid: '9988776655443'
      },
      {
        type: 'maps_search',
        rank_group: 3,
        rank_absolute: 3,
        title: 'Apex Roofing Austin South Branch',
        place_id: 'ChIJ_apex_south_88',
        cid: '8877665544332'
      }
    ];

    // 3. Identity Matching
    // If target has specific Place ID, match exactly
    if (req.target.placeId) {
      const match = sampleItems.find((item) => item.place_id === req.target.placeId);
      if (match) {
        return {
          taskId,
          surface: req.surface,
          device: req.device,
          rank: match.rank_absolute,
          found: true,
          placeIdObserved: match.place_id,
          titleObserved: match.title,
          actualCostMicros: cost,
          isAmbiguousMatch: false,
          confirmationRequired: false,
          observedAt: new Date().toISOString()
        };
      }
    }

    // If target has confirmed CID, match exactly
    if (req.target.cid) {
      const match = sampleItems.find((item) => item.cid === req.target.cid);
      if (match) {
        return {
          taskId,
          surface: req.surface,
          device: req.device,
          rank: match.rank_absolute,
          found: true,
          placeIdObserved: match.place_id,
          titleObserved: match.title,
          actualCostMicros: cost,
          isAmbiguousMatch: false,
          confirmationRequired: false,
          observedAt: new Date().toISOString()
        };
      }
    }

    // 4. Ambiguous Match Check: Name-only query matching multiple candidate branches
    const nameMatches = sampleItems.filter((item) =>
      item.title.toLowerCase().includes(req.target.businessName.toLowerCase())
    );

    if (nameMatches.length > 1) {
      // Multiple entities match ambiguous business name! Require confirmation before assigning rank
      return {
        taskId,
        surface: req.surface,
        device: req.device,
        rank: null, // DO NOT GUESS RANK!
        found: false,
        actualCostMicros: cost,
        isAmbiguousMatch: true,
        confirmationRequired: true,
        taskError: `Ambiguous match: Found ${nameMatches.length} candidate businesses matching "${req.target.businessName}". Confirmation of Place ID or CID is required.`,
        observedAt: new Date().toISOString()
      };
    }

    if (nameMatches.length === 1) {
      return {
        taskId,
        surface: req.surface,
        device: req.device,
        rank: nameMatches[0].rank_absolute,
        found: true,
        placeIdObserved: nameMatches[0].place_id,
        titleObserved: nameMatches[0].title,
        actualCostMicros: cost,
        isAmbiguousMatch: false,
        confirmationRequired: false,
        observedAt: new Date().toISOString()
      };
    }

    // Not found within requested depth
    return {
      taskId,
      surface: req.surface,
      device: req.device,
      rank: null,
      found: false,
      actualCostMicros: cost,
      isAmbiguousMatch: false,
      confirmationRequired: false,
      observedAt: new Date().toISOString()
    };
  }
}
