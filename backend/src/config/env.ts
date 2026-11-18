import { config } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

// Load .env from repo root; no-op in production (env vars already set)
config({ path: resolve(__dirname, '../../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_PATH: z.string().default('./data/inbox.db'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  AI_PROVIDER: z.enum(['ollama', 'openai']).default('ollama'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),
  OLLAMA_CHAT_MODEL: z.string().default('llama3.2:3b'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(768),
  RELEVANCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.35),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:');
  console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = result.data;
