import { z } from 'zod';

export const listItemsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z.enum(['pending', 'ready', 'failed']).optional(),
});

export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
