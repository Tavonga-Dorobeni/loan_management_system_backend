import type { Request, Response } from 'express';

import { toListQueryParams } from '@/common/utils/list';
import { sendSuccess } from '@/common/utils/response';
import { activityLogService } from '@/modules/activity_logs/services/activity-log.service';
import { LoanModel } from '@/modules/loans/model';
import { notificationService } from '@/modules/notifications/services/notification.service';
import { repaymentService } from '@/modules/repayments/services/repayment.service';

export class RepaymentController {
  async list(req: Request, res: Response): Promise<Response> {
    const repayments = await repaymentService.list({
      ...toListQueryParams(req.query as Record<string, unknown>),
      loanId:
        typeof req.query.loanId === 'number'
          ? req.query.loanId
          : req.query.loanId
            ? Number(req.query.loanId)
            : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      transactionDateFrom:
        typeof req.query.transactionDateFrom === 'string'
          ? req.query.transactionDateFrom
          : undefined,
      transactionDateTo:
        typeof req.query.transactionDateTo === 'string'
          ? req.query.transactionDateTo
          : undefined,
    });
    return sendSuccess(res, repayments, 'Repayments retrieved successfully');
  }

  async getById(req: Request, res: Response): Promise<Response> {
    const repayment = await repaymentService.getById(Number(req.params.repayment_id));
    return sendSuccess(res, repayment, 'Repayment retrieved successfully');
  }

  async create(req: Request, res: Response): Promise<Response> {
    const repayment = await repaymentService.create(req.body);
    const loan = await LoanModel.findByPk(repayment.loanId);

    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'repayment',
      entityId: repayment.id,
      action: 'repayment.created',
      summary: `${req.user?.email ?? 'System'} created repayment #${repayment.id} for loan ${loan?.referenceNumber ?? repayment.loanId}`,
      metadata: {
        loanId: repayment.loanId,
        amount: repayment.amount,
        status: repayment.status,
      },
      sourceType: 'api',
    });

    if (repayment.status === 'UNDER') {
      await notificationService.publish({
        eventType: 'repayment.created.under',
        actorUserId: req.user?.id,
        reference: loan?.referenceNumber ?? String(repayment.loanId),
        metadata: {
          repaymentId: repayment.id,
          loanId: repayment.loanId,
          amount: repayment.amount,
        },
      });
    }

    return sendSuccess(res, repayment, 'Repayment created successfully', 201);
  }

  async update(req: Request, res: Response): Promise<Response> {
    const existingRepayment = await repaymentService.getById(
      Number(req.params.repayment_id)
    );
    const repayment = await repaymentService.update(
      Number(req.params.repayment_id),
      req.body
    );
    const loan = await LoanModel.findByPk(repayment.loanId);

    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'repayment',
      entityId: repayment.id,
      action: 'repayment.updated',
      summary: `${req.user?.email ?? 'System'} updated repayment #${repayment.id}`,
      metadata: {
        before: existingRepayment,
        after: repayment,
      },
      sourceType: 'api',
    });

    if (repayment.status === 'UNDER') {
      await notificationService.publish({
        eventType: 'repayment.created.under',
        actorUserId: req.user?.id,
        reference: loan?.referenceNumber ?? String(repayment.loanId),
        metadata: {
          repaymentId: repayment.id,
          loanId: repayment.loanId,
          amount: repayment.amount,
        },
      });
    }

    return sendSuccess(res, repayment, 'Repayment updated successfully');
  }

  async delete(req: Request, res: Response): Promise<Response> {
    const existingRepayment = await repaymentService.getById(
      Number(req.params.repayment_id)
    );
    const result = await repaymentService.delete(Number(req.params.repayment_id));

    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'repayment',
      entityId: result.id,
      action: 'repayment.deleted',
      summary: `${req.user?.email ?? 'System'} deleted repayment #${result.id}`,
      metadata: existingRepayment as unknown as Record<string, unknown>,
      sourceType: 'api',
    });

    return sendSuccess(res, result, 'Repayment deleted successfully');
  }
}

export const repaymentController = new RepaymentController();
