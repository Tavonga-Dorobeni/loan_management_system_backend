import type { Request, Response } from 'express';

import { Roles } from '@/common/types/roles';
import { activityLogService } from '@/modules/activity_logs/services/activity-log.service';
import { loanController } from '@/modules/loans/controller';
import { loanService } from '@/modules/loans/services/loan.service';
import { UserModel } from '@/modules/users/model';

const createResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('LoanController lifecycle actions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records a write-off activity log entry with the prior status and reason', async () => {
    jest.spyOn(loanService, 'writeOff').mockResolvedValue({
      loan: {
        id: 12,
        borrowerId: 7,
        referenceNumber: 'REF-042',
        type: 'SALARY_ADVANCE',
        status: 'WRITE-OFF',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T00:00:00.000Z',
        disbursementDate: '2026-01-05T00:00:00.000Z',
        repaymentAmount: 100,
        totalAmount: 1200,
        amountPaid: 300,
        amountDue: 900,
        message: 'Board-approved write-off after collections review',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-05-06T00:00:00.000Z',
      },
      priorStatus: 'ACTIVE',
      reason: 'Board-approved write-off after collections review',
    });
    jest.spyOn(UserModel, 'findByPk').mockResolvedValue({
      firstName: 'John',
      lastName: 'Doe',
    } as never);
    jest.spyOn(activityLogService, 'record').mockResolvedValue();

    const req = {
      params: { loan_id: '12' },
      body: { reason: 'Board-approved write-off after collections review' },
      user: {
        id: 4,
        email: 'john@example.com',
        role: Roles.ADMIN,
      },
    } as unknown as Request;
    const res = createResponse();

    await loanController.writeOff(req, res);

    expect(activityLogService.record).toHaveBeenCalledWith({
      actorUserId: 4,
      actorRole: Roles.ADMIN,
      entityType: 'loan',
      entityId: 12,
      action: 'loan.write_off',
      summary:
        'John Doe (admin) wrote off Loan REF-042: Board-approved write-off after collections review',
      metadata: {
        from: 'ACTIVE',
        reason: 'Board-approved write-off after collections review',
      },
      sourceType: 'api',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        id: 12,
        status: 'WRITE-OFF',
      }),
      message: 'Loan written off successfully',
    });
  });

  it('records an early-maturity activity log entry with the prior and new maturity details', async () => {
    jest.spyOn(loanService, 'earlyMaturity').mockResolvedValue({
      loan: {
        id: 7,
        borrowerId: 3,
        referenceNumber: 'REF-007',
        type: 'SALARY_ADVANCE',
        status: 'ACTIVE',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2027-03-15T00:00:00.000Z',
        disbursementDate: '2026-01-05T00:00:00.000Z',
        repaymentAmount: 4800,
        totalAmount: 12000,
        amountPaid: 7200,
        amountDue: 4800,
        message: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-05-06T00:00:00.000Z',
      },
      priorEndDate: '2027-12-31',
      newEndDate: '2027-03-15',
      priorRepaymentAmount: 400,
      newRepaymentAmount: 4800,
    });
    jest.spyOn(UserModel, 'findByPk').mockResolvedValue({
      firstName: 'Jane',
      lastName: 'Doe',
    } as never);
    jest.spyOn(activityLogService, 'record').mockResolvedValue();

    const req = {
      params: { loan_id: '7' },
      body: { maturityDate: '2027-03-15' },
      user: {
        id: 5,
        email: 'jane@example.com',
        role: Roles.LOAN_OFFICER,
      },
    } as unknown as Request;
    const res = createResponse();

    await loanController.earlyMaturity(req, res);

    expect(activityLogService.record).toHaveBeenCalledWith({
      actorUserId: 5,
      actorRole: Roles.LOAN_OFFICER,
      entityType: 'loan',
      entityId: 7,
      action: 'loan.early_maturity',
      summary:
        'Jane Doe (loan_officer) brought forward maturity on Loan REF-007 to 2027-03-15',
      metadata: {
        priorEndDate: '2027-12-31',
        newEndDate: '2027-03-15',
        priorRepaymentAmount: 400,
        newRepaymentAmount: 4800,
      },
      sourceType: 'api',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        id: 7,
        endDate: '2027-03-15T00:00:00.000Z',
        repaymentAmount: 4800,
      }),
      message: 'Loan early maturity applied successfully',
    });
  });
});
