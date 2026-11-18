import { z } from 'zod';

export const ingestBodySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('note'),
    content: z.string().min(1).max(20000),
    title: z.string().max(200).optional(),
  }),
  z.object({
    type: z.literal('url'),
    url: z.string().url().max(2048),
  }),
]);

export type IngestBody = z.infer<typeof ingestBodySchema>;
