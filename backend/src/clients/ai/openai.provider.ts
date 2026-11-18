import OpenAI from 'openai';
import { env } from '../../config/env';
import { AppError, ErrorCode } from '../../lib/errors';
import { withRetry } from '../../lib/retry';
import type { AiProvider, Message } from './aiProvider';

export function createOpenAiProvider(): AiProvider {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  return {
    async embed(texts: string[]): Promise<number[][]> {
      return withRetry(async () => {
        try {
          const res = await client.embeddings.create({
            model: env.OPENAI_EMBEDDING_MODEL,
            input: texts,
          });
          return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
        } catch (err: unknown) {
          if (err instanceof OpenAI.APIError && err.status === 429) {
            throw new AppError(ErrorCode.RATE_LIMITED, 'OpenAI rate limit exceeded');
          }
          const msg = err instanceof Error ? err.message : String(err);
          throw new AppError(ErrorCode.AI_PROVIDER_ERROR, `OpenAI embed failed: ${msg}`);
        }
      });
    },

    async chat(messages: Message[]): Promise<string> {
      return withRetry(async () => {
        try {
          const res = await client.chat.completions.create({
            model: env.OPENAI_CHAT_MODEL,
            messages,
            temperature: 0.2,
          });
          return res.choices[0]?.message.content ?? '';
        } catch (err: unknown) {
          if (err instanceof OpenAI.APIError && err.status === 429) {
            throw new AppError(ErrorCode.RATE_LIMITED, 'OpenAI rate limit exceeded');
          }
          const msg = err instanceof Error ? err.message : String(err);
          throw new AppError(ErrorCode.AI_PROVIDER_ERROR, `OpenAI chat failed: ${msg}`);
        }
      });
    },
  };
}
