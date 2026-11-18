import { Ollama } from 'ollama';
import { env } from '../../config/env';
import { AppError, ErrorCode } from '../../lib/errors';
import { withRetry } from '../../lib/retry';
import type { AiProvider, Message } from './aiProvider';

const DOC_PREFIX = 'search_document: ';
const QUERY_PREFIX = 'search_query: ';

export function createOllamaProvider(): AiProvider {
  const client = new Ollama({ host: env.OLLAMA_BASE_URL });

  return {
    async embed(texts: string[], type: 'document' | 'query' = 'document'): Promise<number[][]> {
      const prefix = type === 'query' ? QUERY_PREFIX : DOC_PREFIX;
      const prefixed = texts.map((t) => `${prefix}${t}`);

      return withRetry(async () => {
        try {
          const result = await client.embed({ model: env.OLLAMA_EMBEDDING_MODEL, input: prefixed });
          return result.embeddings;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new AppError(
            ErrorCode.AI_PROVIDER_ERROR,
            `Ollama is not running at ${env.OLLAMA_BASE_URL}. Start it with: ollama serve. (${msg})`,
          );
        }
      });
    },

    async chat(messages: Message[]): Promise<string> {
      return withRetry(async () => {
        try {
          const result = await client.chat({
            model: env.OLLAMA_CHAT_MODEL,
            messages,
            options: { temperature: 0.2 },
          });
          return result.message.content;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new AppError(
            ErrorCode.AI_PROVIDER_ERROR,
            `Ollama chat failed: ${msg}`,
          );
        }
      });
    },
  };
}
