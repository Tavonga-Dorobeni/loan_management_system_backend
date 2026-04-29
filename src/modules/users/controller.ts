import type { Request, Response } from 'express';

import { Roles } from '@/common/types/roles';
import { toListQueryParams } from '@/common/utils/list';
import { sendSuccess } from '@/common/utils/response';
import { activityLogService } from '@/modules/activity_logs/services/activity-log.service';
import { notificationService } from '@/modules/notifications/services/notification.service';
import { userService } from '@/modules/users/services/user.service';

export class UserController {
  async list(req: Request, res: Response): Promise<Response> {
    const users = await userService.list({
      ...toListQueryParams(req.query as Record<string, unknown>),
      role: typeof req.query.role === 'string' ? req.query.role : undefined,
      status:
        typeof req.query.status === 'string' ? req.query.status : undefined,
    });
    return sendSuccess(res, users, 'Users retrieved successfully');
  }

  async getById(req: Request, res: Response): Promise<Response> {
    const user = await userService.getById(Number(req.params.user_id));
    return sendSuccess(res, user, 'User retrieved successfully');
  }

  async create(req: Request, res: Response): Promise<Response> {
    const user = await userService.create(req.body);
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'user',
      entityId: user.id,
      action: 'user.created',
      summary: `${req.user?.email ?? 'System'} created user ${user.email}`,
      metadata: user as unknown as Record<string, unknown>,
      sourceType: 'api',
    });
    return sendSuccess(res, user, 'User created successfully', 201);
  }

  async update(req: Request, res: Response): Promise<Response> {
    const user = await userService.update(Number(req.params.user_id), req.body);
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'user',
      entityId: user.id,
      action: 'user.updated',
      summary: `${req.user?.email ?? 'System'} updated user ${user.email}`,
      metadata: req.body as Record<string, unknown>,
      sourceType: 'api',
    });
    return sendSuccess(res, user, 'User updated successfully');
  }

  async delete(req: Request, res: Response): Promise<Response> {
    const result = await userService.delete(Number(req.params.user_id));
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'user',
      entityId: result.id,
      action: 'user.deleted',
      summary: `${req.user?.email ?? 'System'} deleted user #${result.id}`,
      sourceType: 'api',
    });
    return sendSuccess(res, result, 'User deleted successfully');
  }

  async changePassword(req: Request, res: Response): Promise<Response> {
    const result = await userService.changePassword(
      Number(req.params.user_id),
      req.body,
      {
        id: req.user?.id ?? 0,
        role: req.user?.role ?? Roles.CUSTOMER_SUPPORT,
      }
    );
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'user',
      entityId: Number(req.params.user_id),
      action: 'user.password.changed',
      summary: `${req.user?.email ?? 'System'} changed password for user #${req.params.user_id}`,
      sourceType: 'api',
    });
    const targetUser = await userService.getById(Number(req.params.user_id));
    await notificationService.publish({
      eventType: 'user.password.changed',
      targetEmail: targetUser.email,
      targetUserId: targetUser.id,
      actorUserId: req.user?.id,
      metadata: {
        userId: targetUser.id,
      },
    });
    return sendSuccess(res, result, 'Password changed successfully');
  }
}

export const userController = new UserController();
