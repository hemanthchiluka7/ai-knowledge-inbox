import { describe, it, expect } from 'vitest';
import { AppError, ErrorCode } from '../../src/lib/errors';

describe('AppError', () => {
  it('maps VALIDATION_ERROR to 400', () => {
    const err = new AppError(ErrorCode.VALIDATION_ERROR, 'Bad input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.name).toBe('AppError');
  });

  it('maps NOT_FOUND to 404', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 'Not found');
    expect(err.statusCode).toBe(404);
  });

  it('maps DUPLICATE_ITEM to 409', () => {
    const err = new AppError(ErrorCode.DUPLICATE_ITEM, 'Already exists');
    expect(err.statusCode).toBe(409);
  });

  it('maps URL_NOT_ALLOWED to 422', () => {
    const err = new AppError(ErrorCode.URL_NOT_ALLOWED, 'Private IP blocked');
    expect(err.statusCode).toBe(422);
  });

  it('maps UPSTREAM_FETCH_FAILED to 502', () => {
    const err = new AppError(ErrorCode.UPSTREAM_FETCH_FAILED, 'Timeout');
    expect(err.statusCode).toBe(502);
  });

  it('maps AI_PROVIDER_ERROR to 502', () => {
    const err = new AppError(ErrorCode.AI_PROVIDER_ERROR, 'Ollama unreachable');
    expect(err.statusCode).toBe(502);
  });

  it('maps INTERNAL_ERROR to 500', () => {
    const err = new AppError(ErrorCode.INTERNAL_ERROR, 'Unexpected');
    expect(err.statusCode).toBe(500);
  });

  it('stores details payload', () => {
    const details = { field: ['required'] };
    const err = new AppError(ErrorCode.VALIDATION_ERROR, 'Bad input', details);
    expect(err.details).toEqual(details);
  });

  it('is an instance of Error', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 'x');
    expect(err).toBeInstanceOf(Error);
  });
});
