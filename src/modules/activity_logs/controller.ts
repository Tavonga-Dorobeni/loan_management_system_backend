import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { toListQueryParams } from '@/common/utils/list';
import { activityLogService } from '@/modules/activity_logs/services/activity-log.service';

export class ActivityLogController {
  async list(req: Request, res: Response): Promise<Response> {
    const activityLogs = await activityLogService.list({
      ...toListQueryParams(req.query as Record<string, unknown>),
      actorUserId:
        typeof req.query.actorUserId === 'number'
          ? req.query.actorUserId
          : req.query.actorUserId
            ? Number(req.query.actorUserId)
            : undefined,
      actorRole:
        typeof req.query.actorRole === 'string' ? req.query.actorRole : undefined,
      entityType:
        typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
      entityId:
        typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
      sourceType:
        typeof req.query.sourceType === 'string' ? req.query.sourceType : undefined,
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
    });

    return sendSuccess(res, activityLogs, 'Activity logs retrieved successfully');
  }
}

export const activityLogController = new ActivityLogController();
