import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError, ErrorCode } from '../lib/errors';

type Target = 'body' | 'query' | 'params';

// Express v5 makes req.query a getter-only property, so we store parsed data here
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      parsed?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(
        new AppError(ErrorCode.VALIDATION_ERROR, 'Validation failed', result.error.flatten().fieldErrors),
      );
      return;
    }
    req.parsed ??= {};
    req.parsed[target] = result.data;
    next();
  };
}
