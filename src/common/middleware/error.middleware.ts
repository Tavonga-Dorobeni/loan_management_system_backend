import type { NextFunction, Request, Response } from 'express';

import { AppError } from '@/common/utils/errors';
import { logger } from '@/common/utils/logger';
import { sendError } from '@/common/utils/response';

export const notFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  if (error instanceof AppError) {
    return sendError(res, error.message, error.statusCode);
  }

  logger.error({ err: error }, 'Unhandled application error');
  return sendError(res, 'Internal server error', 500);
};
