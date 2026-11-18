import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { setAiProvider } from '../../src/clients/ai/aiProvider';
import { createFakeProvider } from '../../src/clients/ai/fake.provider';
import { jobQueue } from '../../src/services/jobQueue';

beforeAll(async () => {
  setAiProvider(createFakeProvider());
  // Drain any leftover jobs from previous test files
  await jobQueue.drain();
});

const NOTE_CONTENT =
  'The mitochondria is the powerhouse of the cell. It produces ATP through oxidative phosphorylation. ' +
  'Cells rely on mitochondria for energy production. Without mitochondria, aerobic organisms could not survive.';

describe('POST /ingest (note)', () => {
  it('returns 202 with pending item', async () => {
    const res = await request(app)
      .post('/ingest')
      .send({ type: 'note', content: NOTE_CONTENT, title: 'Bio Note' });

    expect(res.status).toBe(202);
    expect(res.body.item.status).toBe('pending');
    expect(res.body.item.sourceType).toBe('note');
    expect(res.body.item.id).toBeDefined();
  });

  it('item becomes ready after processing', async () => {
    const ingest = await request(app)
      .post('/ingest')
      .send({ type: 'note', content: NOTE_CONTENT + ' (second copy to avoid dedup)' });

    expect(ingest.status).toBe(202);
    const id = ingest.body.item.id;
    await jobQueue.drain();

    const item = await request(app).get(`/items/${id}`);
    expect(item.status).toBe(200);
    // If status is 'failed', show the error message for debugging
    expect(item.body.item.errorMessage ?? '').toBe('');
    expect(item.body.item.status).toBe('ready');
    expect(item.body.item.chunkCount).toBeGreaterThan(0);
  });

  it('returns 409 on duplicate content', async () => {
    const content = 'Unique content for dedup test ' + Date.now();
    await request(app).post('/ingest').send({ type: 'note', content });
    const res = await request(app).post('/ingest').send({ type: 'note', content });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ITEM');
  });

  it('returns 400 for missing type', async () => {
    const res = await request(app).post('/ingest').send({ content: 'oops' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for empty content', async () => {
    const res = await request(app).post('/ingest').send({ type: 'note', content: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /items', () => {
  it('returns items list with pagination shape', async () => {
    const res = await request(app).get('/items');
    if (res.status !== 200) console.error('GET /items error:', JSON.stringify(res.body));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect('nextCursor' in res.body).toBe(true);
  });

  it('filters by status=ready', async () => {
    await jobQueue.drain();
    const res = await request(app).get('/items?status=ready');
    expect(res.status).toBe(200);
    for (const item of res.body.items) {
      expect(item.status).toBe('ready');
    }
  });
});

describe('GET /items/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/items/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /items/:id', () => {
  it('returns 204 and item is gone', async () => {
    const ingest = await request(app)
      .post('/ingest')
      .send({ type: 'note', content: 'Delete me ' + Date.now() });
    await jobQueue.drain();
    const id = ingest.body.item.id;

    const del = await request(app).delete(`/items/${id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/items/${id}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/items/ghost-id');
    expect(res.status).toBe(404);
  });
});
