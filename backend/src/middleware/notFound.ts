import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../lib/errors';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(ErrorCode.NOT_FOUND, `${req.method} ${req.path} not found`));
}
