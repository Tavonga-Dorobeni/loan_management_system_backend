import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { activityLogService } from '@/modules/activity_logs/services/activity-log.service';
import { borrowerKycService } from '@/modules/borrower_kyc/services/borrower-kyc.service';
import { notificationService } from '@/modules/notifications/services/notification.service';

export class BorrowerKycController {
  async create(req: Request, res: Response): Promise<Response> {
    const document = await borrowerKycService.create(req.body, req.file);
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'borrower_kyc',
      entityId: document.id,
      action: 'borrower.kyc.uploaded',
      summary: `${req.user?.email ?? 'System'} uploaded ${document.documentType} for borrower #${document.borrowerId}`,
      metadata: {
        borrowerId: document.borrowerId,
        documentType: document.documentType,
      },
      sourceType: 'api',
    });
    await notificationService.publish({
      eventType: 'borrower.kyc.uploaded',
      actorUserId: req.user?.id,
      metadata: {
        borrowerId: document.borrowerId,
        documentType: document.documentType,
      },
    });
    return sendSuccess(res, document, 'Borrower KYC document uploaded successfully', 201);
  }

  async listByBorrower(req: Request, res: Response): Promise<Response> {
    const documents = await borrowerKycService.listByBorrower(
      Number(req.params.borrower_id),
      typeof req.query.documentType === 'string' ? req.query.documentType : undefined
    );
    return sendSuccess(
      res,
      { items: documents },
      'Borrower KYC documents retrieved successfully'
    );
  }
}

export const borrowerKycController = new BorrowerKycController();
