import type { NextFunction, Request, Response } from 'express';

import { ForbiddenError } from '@/common/utils/errors';
import { authMiddleware, requireRole } from '@/common/middleware/auth.middleware';
import { Roles } from '@/common/types/roles';

jest.mock('@/common/config/auth', () => ({
  verifyAccessToken: jest.fn(),
}));

const { verifyAccessToken } = jest.requireMock('@/common/config/auth') as {
  verifyAccessToken: jest.Mock;
};

describe('auth middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('attaches the authenticated user from the bearer token', () => {
    verifyAccessToken.mockReturnValue({
      sub: 17,
      email: 'admin@example.com',
      role: Roles.ADMIN,
    });

    const req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as Request;
    const next = jest.fn() as NextFunction;

    authMiddleware(req, {} as Response, next);

    expect(req.user).toEqual({
      id: 17,
      email: 'admin@example.com',
      role: Roles.ADMIN,
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('denies authenticated users outside the allowed role set', () => {
    const req = {
      user: {
        id: 22,
        email: 'collections@example.com',
        role: Roles.COLLECTIONS_OFFICER,
      },
    } as Request;
    const next = jest.fn();

    requireRole(Roles.ADMIN, Roles.LOAN_OFFICER)(
      req,
      {} as Response,
      next as unknown as NextFunction
    );

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    const error = next.mock.calls[0]?.[0] as ForbiddenError;
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('You do not have permission to perform this action');
  });
});
