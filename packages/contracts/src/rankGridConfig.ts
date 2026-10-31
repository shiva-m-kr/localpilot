import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';
import { SearchSurfaceSchema, SearchDeviceSchema } from './rankProvider.js';

export const GridSizeSchema = z.enum(['3x3', '5x5', '7x7']);
export type GridSize = z.infer<typeof GridSizeSchema>;

export const GridPointSchema = z.object({
  pointIndex: z.number().int().nonnegative(),
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});
export type GridPoint = z.infer<typeof GridPointSchema>;

export const GridGeometrySchema = z.object({
  centerLat: z.number().min(-90).max(90),
  centerLng: z.number().min(-180).max(180),
  gridSize: GridSizeSchema,
  spacingKm: z.number().min(0.2).max(50),
  totalPoints: z.number().int().positive()
});
export type GridGeometry = z.infer<typeof GridGeometrySchema>;

export const LocalityTypeSchema = z.enum([
  'EXPLICIT_LOCALITY', // e.g. "roof repair austin"
  'IMPLIED_NEAR_ME', // e.g. "roof repair near me"
  'NON_LOCAL_GENERIC' // e.g. "shingle inspection"
]);
export type LocalityType = z.infer<typeof LocalityTypeSchema>;

export const TrackedKeywordSpecSchema = z.object({
  query: z.string().min(2),
  localityType: LocalityTypeSchema,
  searchSurface: SearchSurfaceSchema
});
export type TrackedKeywordSpec = z.infer<typeof TrackedKeywordSpecSchema>;

export const GridTargetIdentitySchema = z.object({
  businessName: z.string().min(2),
  placeId: z.string().min(5),
  cid: z.string().optional(),
  hideResidentialStreetAddress: z.boolean().default(false),
  publicDisplayAddress: z.string()
});
export type GridTargetIdentity = z.infer<typeof GridTargetIdentitySchema>;

export const RankGridConfigSchema = z.object({
  configId: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  version: z.number().int().positive(),
  configHash: z.string(),
  geometry: GridGeometrySchema,
  points: z.array(GridPointSchema),
  keywords: z.array(TrackedKeywordSpecSchema).min(1),
  device: SearchDeviceSchema,
  depth: z.number().int().min(1).max(100).default(20),
  target: GridTargetIdentitySchema,
  createdAt: ISO8601TimestampSchema
});
export type RankGridConfig = z.infer<typeof RankGridConfigSchema>;
