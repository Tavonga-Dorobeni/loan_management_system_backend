import type { Request, Response } from 'express';

import { toListQueryParams } from '@/common/utils/list';
import { sendSuccess } from '@/common/utils/response';
import { activityLogService } from '@/modules/activity_logs/services/activity-log.service';
import { borrowerService } from '@/modules/borrowers/services/borrower.service';
import { loanService } from '@/modules/loans/services/loan.service';

export class BorrowerController {
  async list(req: Request, res: Response): Promise<Response> {
    const borrowers = await borrowerService.list(
      toListQueryParams(req.query as Record<string, unknown>)
    );
    return sendSuccess(res, borrowers, 'Borrowers retrieved successfully');
  }

  async getById(req: Request, res: Response): Promise<Response> {
    const borrower = await borrowerService.getById(Number(req.params.borrower_id));
    return sendSuccess(res, borrower, 'Borrower retrieved successfully');
  }

  async create(req: Request, res: Response): Promise<Response> {
    const borrower = await borrowerService.create(req.body);
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'borrower',
      entityId: borrower.id,
      action: 'borrower.created',
      summary: `${req.user?.email ?? 'System'} created borrower ${borrower.firstName} ${borrower.lastName}`,
      metadata: borrower as unknown as Record<string, unknown>,
      sourceType: 'api',
    });
    return sendSuccess(res, borrower, 'Borrower created successfully', 201);
  }

  async update(req: Request, res: Response): Promise<Response> {
    const borrower = await borrowerService.update(
      Number(req.params.borrower_id),
      req.body,
      req.user?.role
    );
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'borrower',
      entityId: borrower.id,
      action: 'borrower.updated',
      summary: `${req.user?.email ?? 'System'} updated borrower ${borrower.firstName} ${borrower.lastName}`,
      metadata: req.body as Record<string, unknown>,
      sourceType: 'api',
    });
    return sendSuccess(res, borrower, 'Borrower updated successfully');
  }

  async getProfile(req: Request, res: Response): Promise<Response> {
    const profile = await borrowerService.getProfile(Number(req.params.borrower_id));
    return sendSuccess(res, profile, 'Borrower profile retrieved successfully');
  }

  async listLoans(req: Request, res: Response): Promise<Response> {
    const loans = await loanService.list({
      ...toListQueryParams(req.query as Record<string, unknown>),
      borrowerId: Number(req.params.borrower_id),
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      startDateFrom:
        typeof req.query.startDateFrom === 'string'
          ? req.query.startDateFrom
          : undefined,
      startDateTo:
        typeof req.query.startDateTo === 'string' ? req.query.startDateTo : undefined,
      endDateFrom:
        typeof req.query.endDateFrom === 'string' ? req.query.endDateFrom : undefined,
      endDateTo:
        typeof req.query.endDateTo === 'string' ? req.query.endDateTo : undefined,
    });

    return sendSuccess(res, loans, 'Borrower loans retrieved successfully');
  }

  async delete(req: Request, res: Response): Promise<Response> {
    const result = await borrowerService.delete(Number(req.params.borrower_id));
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'borrower',
      entityId: result.id,
      action: 'borrower.deleted',
      summary: `${req.user?.email ?? 'System'} deleted borrower #${result.id}`,
      sourceType: 'api',
    });
    return sendSuccess(res, result, 'Borrower deleted successfully');
  }
}

export const borrowerController = new BorrowerController();
