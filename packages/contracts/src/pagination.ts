import { z } from 'zod';

export const PaginationParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  order: z.enum(['asc', 'desc']).default('desc')
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
    totalCount: z.number().int().nonnegative().optional()
  });
}

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
};
