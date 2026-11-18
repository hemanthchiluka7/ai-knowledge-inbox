import { getAiProvider } from '../clients/ai/aiProvider';
import { retrieveChunks } from './retrieval.service';
import { buildAnswerMessages, parseCitationRefs } from '../prompts/answer.prompt';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export interface Citation {
  ref: number;
  itemId: string;
  chunkId: number;
  title: string | null;
  sourceType: 'note' | 'url';
  sourceUrl: string | null;
  snippet: string;
  score: number;
}

export interface AnswerResult {
  answer: string;
  citations: Citation[];
  meta: {
    retrievedChunks: number;
    model: string;
    latencyMs: number;
  };
}

const NO_ANSWER = "I couldn't find anything about that in your saved items.";

export async function answerQuestion(question: string, topK: number): Promise<AnswerResult> {
  const start = Date.now();

  const chunks = await retrieveChunks(question, topK);

  logger.info(
    { count: chunks.length, topScore: chunks[0]?.score ?? 0 },
    'query.retrieved',
  );

  if (chunks.length === 0) {
    return {
      answer: NO_ANSWER,
      citations: [],
      meta: { retrievedChunks: 0, model: 'none', latencyMs: Date.now() - start },
    };
  }

  const sources = chunks.map((c, i) => ({
    ref: i + 1,
    title: c.title,
    content: c.content,
  }));

  const messages = buildAnswerMessages(question, sources);
  const provider = getAiProvider();
  const answerText = await provider.chat(messages);

  // Parse [n] markers; fall back to all retrieved if none found
  const referencedRefs = parseCitationRefs(answerText);
  const activeRefs = referencedRefs.length > 0
    ? referencedRefs
    : chunks.map((_, i) => i + 1);

  const citations: Citation[] = activeRefs
    .map((ref) => {
      const chunk = chunks[ref - 1];
      if (!chunk) return null;
      return {
        ref,
        itemId: chunk.itemId,
        chunkId: chunk.chunkId,
        title: chunk.title,
        sourceType: chunk.sourceType,
        sourceUrl: chunk.sourceUrl,
        snippet: chunk.content.slice(0, 300),
        score: chunk.vectorScore,
      };
    })
    .filter((c): c is Citation => c !== null);

  const latencyMs = Date.now() - start;
  const model = env.AI_PROVIDER === 'openai' ? env.OPENAI_CHAT_MODEL : env.OLLAMA_CHAT_MODEL;

  logger.info({ latencyMs, model }, 'query.answered');

  return { answer: answerText, citations, meta: { retrievedChunks: chunks.length, model, latencyMs } };
}
