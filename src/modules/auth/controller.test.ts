import type { Request, Response } from 'express';

import { UnauthorizedError } from '@/common/utils/errors';
import { authController } from '@/modules/auth/controller';
import { authService } from '@/modules/auth/services/auth.service';
import { activityLogService } from '@/modules/activity_logs/services/activity-log.service';
import { notificationService } from '@/modules/notifications/services/notification.service';

const createResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('AuthController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the verified login envelope with user and token', async () => {
    jest.spyOn(authService, 'login').mockResolvedValue({
      token: 'jwt-token',
      user: {
        id: 5,
        firstName: 'Tariro',
        lastName: 'Moyo',
        email: 'tariro@example.com',
        role: 'loan_officer',
        status: 'active',
      },
    });
    jest.spyOn(activityLogService, 'record').mockResolvedValue();

    const req = {
      body: {
        email: 'tariro@example.com',
        password: 'secret123',
      },
    } as Request;
    const res = createResponse();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        token: 'jwt-token',
        user: {
          id: 5,
          firstName: 'Tariro',
          lastName: 'Moyo',
          email: 'tariro@example.com',
          role: 'loan_officer',
          status: 'active',
        },
      },
      message: 'Login successful',
    });
  });

  it('records and publishes login failure events before rethrowing', async () => {
    const error = new UnauthorizedError('Invalid credentials');
    jest.spyOn(authService, 'login').mockRejectedValue(error);
    jest.spyOn(activityLogService, 'record').mockResolvedValue();
    jest.spyOn(notificationService, 'publish').mockResolvedValue();

    const req = {
      body: {
        email: 'unknown@example.com',
        password: 'wrong-password',
      },
    } as Request;
    const res = createResponse();

    await expect(authController.login(req, res)).rejects.toThrow(
      'Invalid credentials'
    );
    expect(activityLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login.failure',
        entityId: 'unknown@example.com',
      })
    );
    expect(notificationService.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'auth.login.failure.suspicious',
        targetEmail: 'unknown@example.com',
      })
    );
  });
});
