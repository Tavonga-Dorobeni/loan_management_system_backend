import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { toListQueryParams } from '@/common/utils/list';
import type { NotificationDeliveryStatus } from '@/modules/notifications/dto';
import { notificationService } from '@/modules/notifications/services/notification.service';

export class NotificationController {
  async listDeliveries(req: Request, res: Response): Promise<Response> {
    const deliveries = await notificationService.listDeliveries({
      ...toListQueryParams(req.query as Record<string, unknown>),
      eventType:
        typeof req.query.eventType === 'string' ? req.query.eventType : undefined,
      status:
        typeof req.query.status === 'string'
          ? (req.query.status as NotificationDeliveryStatus)
          : undefined,
      recipient:
        typeof req.query.recipient === 'string' ? req.query.recipient : undefined,
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
    });

    return sendSuccess(
      res,
      deliveries,
      'Notification deliveries retrieved successfully'
    );
  }
}

export const notificationController = new NotificationController();
