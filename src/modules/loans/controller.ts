import type { Request, Response } from 'express';

import { ValidationError } from '@/common/utils/errors';
import { toListQueryParams } from '@/common/utils/list';
import { sendSuccess } from '@/common/utils/response';
import { activityLogService } from '@/modules/activity_logs/services/activity-log.service';
import { loanService } from '@/modules/loans/services/loan.service';
import { notificationService } from '@/modules/notifications/services/notification.service';

export class LoanController {
  async list(req: Request, res: Response): Promise<Response> {
    const loans = await loanService.list({
      ...toListQueryParams(req.query as Record<string, unknown>),
      borrowerId:
        typeof req.query.borrowerId === 'number'
          ? req.query.borrowerId
          : req.query.borrowerId
            ? Number(req.query.borrowerId)
            : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      startDateFrom:
        typeof req.query.startDateFrom === 'string'
          ? req.query.startDateFrom
          : undefined,
      startDateTo:
        typeof req.query.startDateTo === 'string'
          ? req.query.startDateTo
          : undefined,
      endDateFrom:
        typeof req.query.endDateFrom === 'string' ? req.query.endDateFrom : undefined,
      endDateTo:
        typeof req.query.endDateTo === 'string' ? req.query.endDateTo : undefined,
    });
    return sendSuccess(res, loans, 'Loans retrieved successfully');
  }

  async getById(req: Request, res: Response): Promise<Response> {
    const loan = await loanService.getById(Number(req.params.loan_id));
    return sendSuccess(res, loan, 'Loan retrieved successfully');
  }

  async create(req: Request, res: Response): Promise<Response> {
    const loan = await loanService.create(req.body);
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'loan',
      entityId: loan.id,
      action: 'loan.created',
      summary: `${req.user?.email ?? 'System'} created loan ${loan.referenceNumber}`,
      metadata: loan as unknown as Record<string, unknown>,
      sourceType: 'api',
    });
    await notificationService.publish({
      eventType: 'loan.created',
      actorUserId: req.user?.id,
      reference: loan.referenceNumber,
      metadata: {
        loanId: loan.id,
        referenceNumber: loan.referenceNumber,
      },
    });
    return sendSuccess(res, loan, 'Loan created successfully', 201);
  }

  async update(req: Request, res: Response): Promise<Response> {
    const existingLoan = await loanService.getById(Number(req.params.loan_id));
    const loan = await loanService.update(
      Number(req.params.loan_id),
      req.body,
      req.user?.role
    );
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'loan',
      entityId: loan.id,
      action: 'loan.updated',
      summary: `${req.user?.email ?? 'System'} updated loan ${loan.referenceNumber}`,
      metadata: req.body as Record<string, unknown>,
      sourceType: 'api',
    });
    if (existingLoan.status !== loan.status) {
      await activityLogService.record({
        actorUserId: req.user?.id,
        actorRole: req.user?.role,
        entityType: 'loan',
        entityId: loan.id,
        action: 'loan.status.changed',
        summary: `${req.user?.email ?? 'System'} changed status of loan ${loan.referenceNumber} from ${existingLoan.status} to ${loan.status}`,
        metadata: {
          from: existingLoan.status,
          to: loan.status,
        },
        sourceType: 'api',
      });
      await notificationService.publish({
        eventType: 'loan.status.changed',
        actorUserId: req.user?.id,
        reference: loan.referenceNumber,
        metadata: {
          loanId: loan.id,
          from: existingLoan.status,
          to: loan.status,
        },
      });
    }
    return sendSuccess(res, loan, 'Loan updated successfully');
  }

  async delete(req: Request, res: Response): Promise<Response> {
    const result = await loanService.delete(Number(req.params.loan_id));
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'loan',
      entityId: result.id,
      action: 'loan.deleted',
      summary: `${req.user?.email ?? 'System'} deleted loan #${result.id}`,
      sourceType: 'api',
    });
    return sendSuccess(res, result, 'Loan deleted successfully');
  }

  async getDetails(req: Request, res: Response): Promise<Response> {
    const details = await loanService.getDetails(Number(req.params.loan_id));
    return sendSuccess(res, details, 'Loan details retrieved successfully');
  }

  async listRepayments(req: Request, res: Response): Promise<Response> {
    const repayments = await loanService.listRepayments(Number(req.params.loan_id), {
      ...toListQueryParams(req.query as Record<string, unknown>),
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

    return sendSuccess(res, repayments, 'Loan repayments retrieved successfully');
  }

  async importExcel(req: Request, res: Response): Promise<Response> {
    if (!req.file) {
      throw new ValidationError('Excel file is required');
    }

    const result = await loanService.importFromExcel(req.file, req.user);
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'import',
      entityId: req.file.originalname,
      action: 'loan.import.intake.completed',
      summary: `${req.user?.email ?? 'System'} completed loan intake import`,
      metadata: {
        ...result,
        successCount: result.processedRows,
        failureCount: result.failedRows.length,
      },
      sourceType: 'import',
      sourceReference: req.file.originalname,
    });
    await notificationService.publish({
      eventType: 'loan.import.intake.completed',
      actorUserId: req.user?.id,
      metadata: {
        ...result,
        successCount: result.processedRows,
        failureCount: result.failedRows.length,
      },
    });
    return sendSuccess(res, result, 'Loan excel import completed');
  }

  async importApprovalsExcel(req: Request, res: Response): Promise<Response> {
    if (!req.file) {
      throw new ValidationError('Excel file is required');
    }

    const result = await loanService.importApprovalsFromExcel(req.file, req.user);
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'import',
      entityId: req.file.originalname,
      action: 'loan.import.approval.completed',
      summary: `${req.user?.email ?? 'System'} completed loan approval import`,
      metadata: {
        ...result,
        successCount: result.processedRows,
        failureCount: result.failedRows.length,
      },
      sourceType: 'import',
      sourceReference: req.file.originalname,
    });
    await notificationService.publish({
      eventType: 'loan.import.approval.completed',
      actorUserId: req.user?.id,
      metadata: {
        ...result,
        successCount: result.processedRows,
        failureCount: result.failedRows.length,
      },
    });
    return sendSuccess(res, result, 'Loan approval excel import completed');
  }

  async importRepaymentsExcel(req: Request, res: Response): Promise<Response> {
    if (!req.file) {
      throw new ValidationError('Excel file is required');
    }

    const result = await loanService.importRepaymentsFromExcel(req.file, req.user);
    await activityLogService.record({
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      entityType: 'import',
      entityId: req.file.originalname,
      action: 'loan.import.repayment.completed',
      summary: `${req.user?.email ?? 'System'} completed loan repayment import`,
      metadata: {
        ...result,
        successCount: result.processedRows,
        failureCount: result.failedRows.length,
      },
      sourceType: 'import',
      sourceReference: req.file.originalname,
    });
    await notificationService.publish({
      eventType: 'loan.import.repayment.completed',
      actorUserId: req.user?.id,
      metadata: {
        ...result,
        successCount: result.processedRows,
        failureCount: result.failedRows.length,
      },
    });
    return sendSuccess(res, result, 'Loan repayment excel import completed');
  }
}

export const loanController = new LoanController();
