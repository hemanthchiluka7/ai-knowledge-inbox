import { describe, it, expect } from 'vitest';
import { chunkText } from '../../src/services/chunking.service';

const PARA = (n: number) => `Paragraph ${n}. `.repeat(10).trim();

describe('chunkText', () => {
  it('returns empty array for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   ')).toEqual([]);
  });

  it('short text produces a single chunk', () => {
    const chunks = chunkText('Hello world. This is a note.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('Hello world');
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
  });

  it('chunks have non-negative offsets in correct order', () => {
    const text = [PARA(1), PARA(2), PARA(3), PARA(4)].join('\n\n');
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    for (const c of chunks) {
      expect(c.startOffset).toBeGreaterThanOrEqual(0);
      expect(c.endOffset).toBeGreaterThan(c.startOffset);
    }
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startOffset).toBeLessThanOrEqual(chunks[i - 1].endOffset + 1);
    }
  });

  it('token count per chunk stays at or below 400', () => {
    const longText = Array.from({ length: 30 }, (_, i) => PARA(i)).join('\n\n');
    const chunks = chunkText(longText);
    for (const c of chunks) {
      expect(c.tokenCount).toBeLessThanOrEqual(400);
    }
  });

  it('consecutive chunks share overlapping content (overlap > 0)', () => {
    // Build text that forces multiple chunks
    const longText = Array.from({ length: 20 }, (_, i) => `Sentence number ${i + 1} contains some words.`).join(' ');
    const chunks = chunkText(longText);
    if (chunks.length >= 2) {
      // Overlap means chunk[n].startOffset < chunk[n-1].endOffset
      expect(chunks[1].startOffset).toBeLessThan(chunks[0].endOffset);
    }
  });

  it('handles a single huge sentence via hard-split', () => {
    // 1000 words will exceed 400 tokens
    const hugeSentence = 'word '.repeat(1000).trim();
    const chunks = chunkText(hugeSentence);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.tokenCount).toBeLessThanOrEqual(400);
    }
  });

  it('normalizes CRLF and multiple spaces', () => {
    const text = 'Line one.\r\nLine two.  Extra spaces.';
    const chunks = chunkText(text);
    expect(chunks[0].content).not.toContain('\r');
    expect(chunks[0].content).not.toContain('  ');
  });
});
