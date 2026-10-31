import { createHash, randomUUID } from 'crypto';
import {
  RankGridConfig,
  GridGeometry,
  GridPoint,
  GridSize,
  TrackedKeywordSpec,
  GridTargetIdentity,
  SearchDevice,
  LocalityType
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class RankGridConfigService {
  private static configs = new Map<string, RankGridConfig[]>(); // locationId -> versions[]

  static reset(): void {
    this.configs.clear();
  }

  /**
   * Deterministically classifies search query locality.
   */
  static classifyLocality(query: string): LocalityType {
    const q = query.toLowerCase();
    if (/\b(near me|nearby|closest|in my area)\b/i.test(q)) {
      return 'IMPLIED_NEAR_ME';
    }
    if (/\b(austin|tx|texas|toronto|dallas|houston|denver|round rock)\b/i.test(q)) {
      return 'EXPLICIT_LOCALITY';
    }
    return 'NON_LOCAL_GENERIC';
  }

  /**
   * Computes grid points around center coordinates.
   */
  static generateGridPoints(
    centerLat: number,
    centerLng: number,
    gridSize: GridSize,
    spacingKm: number
  ): GridPoint[] {
    const dimension = gridSize === '3x3' ? 3 : gridSize === '5x5' ? 5 : 7;
    const halfDim = Math.floor(dimension / 2);

    // Approximate km to degrees
    const kmPerDegreeLat = 111.32;
    const kmPerDegreeLng = 111.32 * Math.cos((centerLat * Math.PI) / 180);

    const dLat = spacingKm / kmPerDegreeLat;
    const dLng = spacingKm / kmPerDegreeLng;

    const points: GridPoint[] = [];
    let index = 0;

    for (let row = 0; row < dimension; row++) {
      for (let col = 0; col < dimension; col++) {
        const offsetRow = row - halfDim;
        const offsetCol = col - halfDim;

        const lat = Number((centerLat + offsetRow * dLat).toFixed(6));
        const lng = Number((centerLng + offsetCol * dLng).toFixed(6));

        points.push({
          pointIndex: index++,
          row,
          col,
          latitude: lat,
          longitude: lng
        });
      }
    }

    return points;
  }

  /**
   * Computes a deterministic hash of the exact sampling conditions.
   * If two runs have identical configHash, they are directly comparable.
   */
  static computeConfigHash(params: {
    geometry: GridGeometry;
    keywords: TrackedKeywordSpec[];
    device: SearchDevice;
    depth: number;
    placeId: string;
  }): string {
    const canonicalPayload = {
      gridSize: params.geometry.gridSize,
      spacingKm: params.geometry.spacingKm,
      centerLat: params.geometry.centerLat.toFixed(4),
      centerLng: params.geometry.centerLng.toFixed(4),
      keywords: params.keywords
        .map((k) => ({ q: k.query.trim().toLowerCase(), s: k.searchSurface, l: k.localityType }))
        .sort((a, b) => a.q.localeCompare(b.q)),
      device: params.device,
      depth: params.depth,
      placeId: params.placeId
    };

    return createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex');
  }

  /**
   * Creates a versioned grid configuration with SAB privacy enforcement.
   */
  static createConfig(params: {
    organizationId: string;
    locationId: string;
    centerLat: number;
    centerLng: number;
    gridSize: GridSize;
    spacingKm: number;
    keywords: string[];
    device: SearchDevice;
    depth?: number;
    target: {
      businessName: string;
      placeId: string;
      cid?: string;
      hideResidentialStreetAddress: boolean;
      rawStreetAddress?: string;
      city: string;
      state: string;
    };
  }): RankGridConfig {
    if (params.spacingKm < 0.2 || params.spacingKm > 50) {
      throw new ValidationFailedError('Grid spacing must be between 0.2 km and 50 km.');
    }
    if (params.keywords.length === 0) {
      throw new ValidationFailedError('At least one keyword is required for grid tracking.');
    }

    const dimension = params.gridSize === '3x3' ? 3 : params.gridSize === '5x5' ? 5 : 7;
    const totalPoints = dimension * dimension;

    const geometry: GridGeometry = {
      centerLat: params.centerLat,
      centerLng: params.centerLng,
      gridSize: params.gridSize,
      spacingKm: params.spacingKm,
      totalPoints
    };

    const points = this.generateGridPoints(
      params.centerLat,
      params.centerLng,
      params.gridSize,
      params.spacingKm
    );

    const trackedKeywords: TrackedKeywordSpec[] = params.keywords.map((query) => ({
      query,
      localityType: this.classifyLocality(query),
      searchSurface: 'GOOGLE_MAPS'
    }));

    // SAB Privacy Check: Hide residential street address if requested
    let publicDisplayAddress: string;
    if (params.target.hideResidentialStreetAddress) {
      publicDisplayAddress = `${params.target.city}, ${params.target.state} (Service Area Business)`;
    } else {
      publicDisplayAddress = params.target.rawStreetAddress
        ? `${params.target.rawStreetAddress}, ${params.target.city}, ${params.target.state}`
        : `${params.target.city}, ${params.target.state}`;
    }

    const targetIdentity: GridTargetIdentity = {
      businessName: params.target.businessName,
      placeId: params.target.placeId,
      cid: params.target.cid,
      hideResidentialStreetAddress: params.target.hideResidentialStreetAddress,
      publicDisplayAddress
    };

    const depth = params.depth || 20;
    const configHash = this.computeConfigHash({
      geometry,
      keywords: trackedKeywords,
      device: params.device,
      depth,
      placeId: targetIdentity.placeId
    });

    const existingList = this.configs.get(params.locationId) || [];
    const version = existingList.length + 1;

    const config: RankGridConfig = {
      configId: randomUUID(),
      organizationId: params.organizationId,
      locationId: params.locationId,
      version,
      configHash,
      geometry,
      points,
      keywords: trackedKeywords,
      device: params.device,
      depth,
      target: targetIdentity,
      createdAt: new Date().toISOString()
    };

    existingList.push(config);
    this.configs.set(params.locationId, existingList);
    return config;
  }

  /**
   * Compares whether two configurations used identical sampling conditions.
   */
  static areConfigsComparable(configA: RankGridConfig, configB: RankGridConfig): boolean {
    return configA.configHash === configB.configHash;
  }

  static getLatestConfig(locationId: string): RankGridConfig | undefined {
    const list = this.configs.get(locationId);
    return list && list.length > 0 ? list[list.length - 1] : undefined;
  }
}
