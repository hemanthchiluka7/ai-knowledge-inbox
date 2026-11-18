import { createHash } from 'crypto';
import type { AiProvider, Message } from './aiProvider';

/** Deterministic provider for tests — no network, no API key needed */
export function createFakeProvider(dims = 768): AiProvider {
  return {
    async embed(texts: string[]): Promise<number[][]> {
      return texts.map((text) => deterministicEmbedding(text, dims));
    },

    async chat(_messages: Message[]): Promise<string> {
      return 'The answer is based on the provided sources [1].';
    },
  };
}

function deterministicEmbedding(text: string, dims: number): number[] {
  const hash = createHash('sha256').update(text).digest();
  const raw = Array.from({ length: dims }, (_, i) => (hash[i % hash.length] / 255) * 2 - 1);
  const magnitude = Math.sqrt(raw.reduce((s, v) => s + v * v, 0));
  return raw.map((v) => v / magnitude);
}
