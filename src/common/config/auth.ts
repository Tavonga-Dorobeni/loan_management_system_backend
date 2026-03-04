import jwt, { type SignOptions } from 'jsonwebtoken';

import { config } from '@/common/config';
import type { Roles } from '@/common/types/roles';
import { UnauthorizedError } from '@/common/utils/errors';

export interface AuthJwtPayload {
  sub: number;
  email: string;
  role: Roles;
}

export const authConfig = {
  secret: config.auth.jwtSecret,
  expiresIn: config.auth.jwtExpiresIn,
};

export const signAccessToken = (payload: AuthJwtPayload): string => {
  return jwt.sign(payload, authConfig.secret, {
    expiresIn: authConfig.expiresIn as SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): AuthJwtPayload => {
  try {
    return jwt.verify(token, authConfig.secret) as unknown as AuthJwtPayload;
  } catch (_error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};
