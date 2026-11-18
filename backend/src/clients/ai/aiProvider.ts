import { env } from '../../config/env';
import { createOllamaProvider } from './ollama.provider';
import { createOpenAiProvider } from './openai.provider';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiProvider {
  embed(texts: string[], type?: 'document' | 'query'): Promise<number[][]>;
  chat(messages: Message[]): Promise<string>;
}

let _provider: AiProvider | undefined;

export function getAiProvider(): AiProvider {
  if (!_provider) {
    _provider = env.AI_PROVIDER === 'openai' ? createOpenAiProvider() : createOllamaProvider();
  }
  return _provider;
}

/** Override the provider — used in tests to inject fake.provider */
export function setAiProvider(p: AiProvider): void {
  _provider = p;
}
