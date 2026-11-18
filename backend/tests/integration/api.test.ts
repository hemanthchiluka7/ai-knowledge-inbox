import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Error envelope', () => {
  it('unknown route returns 404 with error envelope', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toMatch(/not found/i);
    expect(res.body.error.requestId).toBeDefined();
  });

  it('error envelope always has code, message, details, requestId', async () => {
    const res = await request(app).get('/nope');
    const { error } = res.body;
    expect(error).toHaveProperty('code');
    expect(error).toHaveProperty('message');
    expect(error).toHaveProperty('details');
    expect(error).toHaveProperty('requestId');
  });
});

describe('Request ID middleware', () => {
  it('echoes x-request-id from client', async () => {
    const res = await request(app).get('/health').set('x-request-id', 'client-id-abc');
    expect(res.headers['x-request-id']).toBe('client-id-abc');
  });

  it('generates a UUID when no x-request-id sent', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('requestId in error envelope matches response header', async () => {
    const res = await request(app).get('/nowhere');
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });
});
