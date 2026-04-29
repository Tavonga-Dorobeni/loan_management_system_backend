import type { NextFunction, Request, Response } from 'express';

import { verifyAccessToken } from '@/common/config/auth';
import { roleValues, type Roles } from '@/common/types/roles';
import { ForbiddenError, UnauthorizedError } from '@/common/utils/errors';

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

export const requireRole =
  (...roles: Roles[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(new UnauthorizedError('Missing authenticated user'));
      return;
    }

    if (!roles.includes(user.role)) {
      next(new ForbiddenError('You do not have permission to perform this action'));
      return;
    }

    next();
  };

export const requireAnyAuthenticatedRole = requireRole(...roleValues);
