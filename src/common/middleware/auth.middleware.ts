import type { NextFunction, Request, Response } from 'express';

import { verifyAccessToken } from '@/common/config/auth';
import { UnauthorizedError } from '@/common/utils/errors';

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    next(new UnauthorizedError('Missing bearer token'));
    return;
  }

  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    next(new UnauthorizedError('Malformed authorization header'));
    return;
  }

  const payload = verifyAccessToken(token);
  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };

  next();
};
