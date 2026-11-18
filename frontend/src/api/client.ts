import type { ListResponse, IngestResponse, ItemFull, QueryResponse } from './types';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: unknown,
    public readonly requestId: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE = (import.meta.env['VITE_API_BASE'] as string | undefined) ?? 'http://localhost:4000';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json()) as { error?: { code: string; message: string; details: unknown; requestId: string } };
  if (!res.ok) {
    const e = data.error!;
    throw new ApiError(e.code, e.message, e.details, e.requestId);
  }
  return data as T;
}

export const api = {
  listItems: (params?: { cursor?: string; status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.cursor) q.set('cursor', params.cursor);
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return req<ListResponse>(`/items${qs ? `?${qs}` : ''}`);
  },

  getItem: (id: string) => req<{ item: ItemFull }>(`/items/${id}`),

  deleteItem: (id: string) => req<void>(`/items/${id}`, { method: 'DELETE' }),

  ingestNote: (content: string, title?: string) =>
    req<IngestResponse>('/ingest', {
      method: 'POST',
      body: JSON.stringify({ type: 'note', content, title }),
    }),

  ingestUrl: (url: string) =>
    req<IngestResponse>('/ingest', {
      method: 'POST',
      body: JSON.stringify({ type: 'url', url }),
    }),

  query: (question: string, topK = 5) =>
    req<QueryResponse>('/query', {
      method: 'POST',
      body: JSON.stringify({ question, topK }),
    }),
};
