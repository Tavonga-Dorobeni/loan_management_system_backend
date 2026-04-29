import type { Request, Response } from 'express';

import type { Roles } from '@/common/types/roles';
import { sendSuccess } from '@/common/utils/response';
import { activityLogService } from '@/modules/activity_logs/services/activity-log.service';
import { authService } from '@/modules/auth/services/auth.service';
import { notificationService } from '@/modules/notifications/services/notification.service';

export class AuthController {
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const result = await authService.login(req.body);
      await activityLogService.record({
        actorUserId: result.user.id as number,
        actorRole: result.user.role as Roles,
        entityType: 'user',
        entityId: result.user.id as number,
        action: 'auth.login.success',
        summary: `${result.user.email as string} logged in successfully`,
        metadata: {
          email: result.user.email,
        },
        sourceType: 'api',
      });

      return sendSuccess(res, result, 'Login successful');
    } catch (error) {
      await activityLogService.record({
        entityType: 'user',
        entityId: req.body.email,
        action: 'auth.login.failure',
        summary: `Login failed for ${req.body.email as string}`,
        metadata: {
          email: req.body.email,
        },
        sourceType: 'api',
      });
      await notificationService.publish({
        eventType: 'auth.login.failure.suspicious',
        targetEmail: req.body.email as string,
        metadata: {
          email: req.body.email,
        },
      });
      throw error;
    }
  }

  async register(req: Request, res: Response): Promise<Response> {
    const result = await authService.register(req.body);
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'user',
      entityId: result.user.id as number,
      action: 'user.registered',
      summary: `${result.user.email as string} was registered`,
      metadata: result.user,
      sourceType: 'api',
    });
    await notificationService.publish({
      eventType: 'user.registered',
      targetEmail: result.user.email as string,
      targetUserId: result.user.id as number,
      actorUserId: req.user?.id,
      metadata: result.user as Record<string, unknown>,
    });
    return sendSuccess(res, result, 'Registration successful', 201);
  }
}

export const authController = new AuthController();
