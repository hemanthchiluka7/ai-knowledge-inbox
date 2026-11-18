import { z } from 'zod';

export const queryBodySchema = z.object({
  question: z.string().min(3).max(1000),
  topK: z.number().int().min(1).max(20).default(5),
});

export type QueryBody = z.infer<typeof queryBodySchema>;
