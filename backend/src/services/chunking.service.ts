import { getEncoding } from 'js-tiktoken';

const enc = getEncoding('cl100k_base');
const CHUNK_TOKENS = 400;
const OVERLAP_TOKENS = 60;

export interface ChunkResult {
  content: string;
  tokenCount: number;
  startOffset: number;
  endOffset: number;
}

interface Unit {
  text: string;
  start: number;
  end: number;
  tokens: number;
}

export function chunkText(rawText: string): ChunkResult[] {
  const text = normalizeWhitespace(rawText);
  if (!text) return [];
  const units = extractUnits(text);
  return packIntoChunks(units);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

function countTokens(text: string): number {
  return enc.encode(text).length;
}

/** Split text into semantic units, tracking character offsets. */
function extractUnits(text: string): Unit[] {
  const units: Unit[] = [];
  // Split keeping delimiters so we can track position precisely
  const parts = text.split(/(\n{2,})/);
  let pos = 0;

  for (const part of parts) {
    if (/^\n+$/.test(part)) { pos += part.length; continue; }
    const trimmed = part.trim();
    if (!trimmed) { pos += part.length; continue; }

    const leadingSpaces = part.length - part.trimStart().length;
    const start = pos + leadingSpaces;
    const tokens = countTokens(trimmed);

    if (tokens <= CHUNK_TOKENS) {
      units.push({ text: trimmed, start, end: start + trimmed.length, tokens });
    } else {
      units.push(...splitIntoSentences(trimmed, start));
    }
    pos += part.length;
  }

  return units;
}

function splitIntoSentences(text: string, baseOffset: number): Unit[] {
  const units: Unit[] = [];
  // Split on sentence boundaries: punctuation followed by whitespace + capital or end
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  let pos = 0;

  for (const sent of sentences) {
    const trimmed = sent.trim();
    if (!trimmed) { pos += sent.length + 1; continue; }
    const relStart = text.indexOf(trimmed, pos);
    const start = baseOffset + (relStart >= 0 ? relStart : pos);
    units.push({ text: trimmed, start, end: start + trimmed.length, tokens: countTokens(trimmed) });
    pos = relStart >= 0 ? relStart + sent.length : pos + sent.length;
  }

  return units;
}

function packIntoChunks(units: Unit[]): ChunkResult[] {
  const chunks: ChunkResult[] = [];
  let window: Unit[] = [];
  let windowTokens = 0;

  for (const unit of units) {
    if (unit.tokens > CHUNK_TOKENS) {
      if (window.length > 0) { chunks.push(flush(window, windowTokens)); window = []; windowTokens = 0; }
      chunks.push(...hardSplit(unit));
      continue;
    }

    if (windowTokens + unit.tokens > CHUNK_TOKENS && window.length > 0) {
      chunks.push(flush(window, windowTokens));
      window = getOverlap(window);
      windowTokens = window.reduce((s, u) => s + u.tokens, 0);
    }

    window.push(unit);
    windowTokens += unit.tokens;
  }

  if (window.length > 0) chunks.push(flush(window, windowTokens));
  return chunks;
}

function flush(window: Unit[], tokenCount: number): ChunkResult {
  return {
    content: window.map((u) => u.text).join('\n\n'),
    tokenCount,
    startOffset: window[0].start,
    endOffset: window[window.length - 1].end,
  };
}

function getOverlap(window: Unit[]): Unit[] {
  const result: Unit[] = [];
  let tokens = 0;
  for (let i = window.length - 1; i >= 0; i--) {
    if (tokens + window[i].tokens > OVERLAP_TOKENS) break;
    result.unshift(window[i]);
    tokens += window[i].tokens;
  }
  return result;
}

/** Hard-split a single oversized unit by token count with overlap. */
function hardSplit(unit: Unit): ChunkResult[] {
  const allTokens = enc.encode(unit.text);
  const chunks: ChunkResult[] = [];

  for (let i = 0; i < allTokens.length; i += CHUNK_TOKENS - OVERLAP_TOKENS) {
    const slice = allTokens.slice(i, i + CHUNK_TOKENS);
    const content = enc.decode(slice) as unknown as string;
    const startFrac = i / allTokens.length;
    const endFrac = Math.min(i + slice.length, allTokens.length) / allTokens.length;
    chunks.push({
      content,
      tokenCount: slice.length,
      startOffset: unit.start + Math.floor(startFrac * unit.text.length),
      endOffset: unit.start + Math.floor(endFrac * unit.text.length),
    });
  }

  return chunks;
}
