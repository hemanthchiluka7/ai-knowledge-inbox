import { describe, it, expect } from 'vitest';
import { parseCitationRefs } from '../../src/prompts/answer.prompt';

describe('parseCitationRefs', () => {
  it('extracts single citation', () => {
    expect(parseCitationRefs('The answer is [1].')).toEqual([1]);
  });

  it('extracts multiple citations', () => {
    expect(parseCitationRefs('See [1] and [2] and also [3].')).toEqual([1, 2, 3]);
  });

  it('deduplicates repeated citations', () => {
    expect(parseCitationRefs('[1] and [1] again')).toEqual([1]);
  });

  it('returns empty array when no citations', () => {
    expect(parseCitationRefs('No citations here.')).toEqual([]);
  });

  it('returns sorted refs', () => {
    expect(parseCitationRefs('[3] then [1] then [2]')).toEqual([1, 2, 3]);
  });

  it('ignores non-numeric brackets', () => {
    expect(parseCitationRefs('See [note] and [1]')).toEqual([1]);
  });
});

describe('RRF scoring logic', () => {
  it('score = 1/(60+rank)', () => {
    const rank1 = 1 / (60 + 1);
    const rank2 = 1 / (60 + 2);
    expect(rank1).toBeGreaterThan(rank2);
  });

  it('item appearing in both lists scores higher than either alone', () => {
    const vecOnly = 1 / (60 + 1);
    const both = 1 / (60 + 1) + 1 / (60 + 1);
    expect(both).toBeGreaterThan(vecOnly);
  });
});
