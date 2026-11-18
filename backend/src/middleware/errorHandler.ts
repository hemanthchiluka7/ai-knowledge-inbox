import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../lib/errors';
import { logger } from '../lib/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId ?? 'unknown';

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId }, err.message);
    } else {
      logger.warn({ code: err.code, requestId }, err.message);
    }
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? [],
        requestId,
      },
    });
    return;
  }

  logger.error({ err, requestId, stack: err instanceof Error ? err.stack : undefined }, 'Unexpected error');
  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      details: [],
      requestId,
    },
  });
}
