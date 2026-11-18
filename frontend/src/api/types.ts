export interface ItemSummary {
  id: string;
  sourceType: 'note' | 'url';
  sourceUrl: string | null;
  title: string | null;
  preview: string | null;
  status: 'pending' | 'ready' | 'failed';
  errorMessage: string | null;
  chunkCount: number;
  createdAt: string;
}

export interface ItemFull extends ItemSummary {
  rawContent: string | null;
  updatedAt: string;
}

export interface ListResponse {
  items: ItemSummary[];
  nextCursor: string | null;
}

export interface IngestResponse {
  item: Pick<ItemSummary, 'id' | 'sourceType' | 'sourceUrl' | 'status' | 'createdAt'>;
}

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

export interface QueryResponse {
  answer: string;
  citations: Citation[];
  meta: {
    retrievedChunks: number;
    model: string;
    latencyMs: number;
  };
}
