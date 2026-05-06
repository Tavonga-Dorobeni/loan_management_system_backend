import XLSX from 'xlsx';

import { sequelize } from '@/common/config/database.config';
import { Roles } from '@/common/types/roles';
import { activityLogService } from '@/modules/activity_logs/services/activity-log.service';
import { LoanModel } from '@/modules/loans/model';
import { loanService } from '@/modules/loans/services/loan.service';
import { notificationService } from '@/modules/notifications/services/notification.service';
import { repaymentService } from '@/modules/repayments/services/repayment.service';

const mockTransaction = (transactionToken: never): void => {
  jest
    .spyOn(sequelize, 'transaction')
    .mockImplementation((async (...args: unknown[]) => {
      const callback = typeof args[0] === 'function' ? args[0] : args[1];
      return (callback as (transaction: never) => unknown)(transactionToken);
    }) as never);
};

const createWorkbookBuffer = (rows: unknown[][]): Buffer => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });
};

describe('LoanService repayment import', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports a failed row when the imported repayment period is invalid', async () => {
    const transactionToken = {} as never;
    const file = {
      buffer: createWorkbookBuffer([
        ['A', 'B', 'Reference', 'D', 'E', 'Transaction Date', 'Amount'],
        ['', '', 'LN-001', '', '', '2026-05-01', 100],
      ]),
      originalname: 'repayments.xlsx',
    } as Express.Multer.File;

    mockTransaction(transactionToken);
    jest.spyOn(LoanModel, 'findOne').mockResolvedValue({
      id: 44,
      referenceNumber: 'LN-001',
    } as never);
    jest
      .spyOn(repaymentService, 'createInTransaction')
      .mockRejectedValue(new Error('periodMonth must be between 1 and 12'));

    const result = await loanService.importRepaymentsFromExcel(file, {
      periodYear: 2026,
      periodMonth: 13,
    }, {
      id: 9,
      role: Roles.COLLECTIONS_OFFICER,
    });

    expect(repaymentService.createInTransaction).toHaveBeenCalledWith(
      {
        loanId: 44,
        amount: 100,
        transactionDate: expect.any(Date),
        periodYear: 2026,
        periodMonth: 13,
      },
      transactionToken
    );
    expect(result).toEqual({
      totalRows: 1,
      processedRows: 0,
      successCount: 0,
      failureCount: 1,
      createdRepayments: 0,
      failedRows: [
        {
          row: 2,
          rowNumber: 2,
          reference: 'LN-001',
          error: 'periodMonth must be between 1 and 12',
        },
      ],
    });
  });

  it('maps approval import statuses to ACTIVE and REJECTED', async () => {
    const loan = {
      id: 12,
      referenceNumber: 'LN-APP-001',
      status: 'PENDING',
      repaymentAmount: 100,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-03-01T00:00:00.000Z'),
      amountPaid: null,
      amountDue: null,
      update: jest.fn().mockResolvedValue(undefined),
    };
    const successFile = {
      buffer: createWorkbookBuffer([
        ['A', 'B', 'Reference', 'D', 'E', 'F', 'Status', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Message'],
        ['', '', 'LN-APP-001', '', '', '', 'SUCCESS', '', '', '', '', '', '', '', 'approved'],
      ]),
      originalname: 'approvals-success.xlsx',
    } as Express.Multer.File;
    const rejectedFile = {
      buffer: createWorkbookBuffer([
        ['A', 'B', 'Reference', 'D', 'E', 'F', 'Status', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Message'],
        ['', '', 'LN-APP-001', '', '', '', 'DECLINED', '', '', '', '', '', '', '', 'declined'],
      ]),
      originalname: 'approvals-rejected.xlsx',
    } as Express.Multer.File;

    jest.spyOn(LoanModel, 'findOne').mockResolvedValue(loan as never);
    jest.spyOn(activityLogService, 'record').mockResolvedValue();
    jest.spyOn(notificationService, 'publish').mockResolvedValue();

    const successResult = await loanService.importApprovalsFromExcel(successFile, {
      id: 5,
      role: Roles.CREDIT_ANALYST,
    });

    expect(loan.update).toHaveBeenCalledWith({
      status: 'ACTIVE',
      message: 'approved',
      amountPaid: 0,
      amountDue: 200,
    });
    expect(successResult).toEqual({
      totalRows: 1,
      processedRows: 1,
      successCount: 1,
      failureCount: 0,
      updatedLoans: 1,
      failedRows: [],
    });
    expect(activityLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          from: 'PENDING',
          to: 'ACTIVE',
        }),
      })
    );
    expect(notificationService.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          from: 'PENDING',
          to: 'ACTIVE',
        }),
      })
    );

    jest.clearAllMocks();
    loan.status = 'ACTIVE';

    await loanService.importApprovalsFromExcel(rejectedFile, {
      id: 5,
      role: Roles.CREDIT_ANALYST,
    });

    expect(loan.update).toHaveBeenCalledWith({
      status: 'REJECTED',
      message: 'declined',
      amountPaid: null,
      amountDue: null,
    });
    expect(activityLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          from: 'ACTIVE',
          to: 'REJECTED',
        }),
      })
    );
    expect(notificationService.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          from: 'ACTIVE',
          to: 'REJECTED',
        }),
      })
    );
  });
});

describe('LoanService update', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes a write-off status update and preserves the reason message', async () => {
    const loan = {
      id: 21,
      borrowerId: 8,
      referenceNumber: 'LN-WO-001',
      type: 'SALARY_ADVANCE',
      status: 'ACTIVE',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      disbursementDate: new Date('2026-01-05T00:00:00.000Z'),
      repaymentAmount: 100,
      totalAmount: 1200,
      amountPaid: 300,
      amountDue: 900,
      message: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-06T00:00:00.000Z'),
      update: jest.fn().mockImplementation(async (values: Record<string, unknown>) => {
        Object.assign(loan, values);
      }),
    };

    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);

    const result = await loanService.update(21, {
      status: 'write off',
      message: 'Board-approved write-off after settlement review',
    });

    expect(loan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'WRITE-OFF',
        message: 'Board-approved write-off after settlement review',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 21,
        status: 'WRITE-OFF',
        message: 'Board-approved write-off after settlement review',
      })
    );
  });

  it('rejects a write-off status update when the reason message is blank', async () => {
    const loan = {
      id: 22,
      borrowerId: 8,
      referenceNumber: 'LN-WO-002',
      type: 'SALARY_ADVANCE',
      status: 'ACTIVE',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      disbursementDate: new Date('2026-01-05T00:00:00.000Z'),
      repaymentAmount: 100,
      totalAmount: 1200,
      amountPaid: 300,
      amountDue: 900,
      message: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-06T00:00:00.000Z'),
      update: jest.fn(),
    };

    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);

    await expect(
      loanService.update(22, {
        status: 'WRITE-OFF',
        message: '   ',
      })
    ).rejects.toThrow('message is required when status is WRITE-OFF');
    expect(loan.update).not.toHaveBeenCalled();
  });
});

describe('LoanService lifecycle actions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes off a loan with the provided reason', async () => {
    const transactionToken = {} as never;
    const loan = {
      id: 31,
      borrowerId: 8,
      referenceNumber: 'LN-WO-031',
      type: 'SALARY_ADVANCE',
      status: 'ACTIVE',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      disbursementDate: new Date('2026-01-05T00:00:00.000Z'),
      repaymentAmount: 100,
      totalAmount: 1200,
      amountPaid: 300,
      amountDue: 900,
      message: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-06T00:00:00.000Z'),
      update: jest.fn().mockImplementation(async (values: Record<string, unknown>) => {
        Object.assign(loan, values);
      }),
    };

    mockTransaction(transactionToken);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);

    const result = await loanService.writeOff(
      31,
      'Board-approved write-off after collections review'
    );

    expect(LoanModel.findByPk).toHaveBeenCalledWith(31, { transaction: transactionToken });
    expect(loan.update).toHaveBeenCalledWith(
      {
        status: 'WRITE-OFF',
        message: 'Board-approved write-off after collections review',
      },
      { transaction: transactionToken }
    );
    expect(result).toEqual({
      loan: expect.objectContaining({
        id: 31,
        status: 'WRITE-OFF',
        message: 'Board-approved write-off after collections review',
      }),
      priorStatus: 'ACTIVE',
      reason: 'Board-approved write-off after collections review',
    });
  });

  it('applies early maturity by bringing endDate forward and setting repaymentAmount to amountDue', async () => {
    const transactionToken = {} as never;
    const loan = {
      id: 41,
      borrowerId: 8,
      referenceNumber: 'LN-EM-041',
      type: 'SALARY_ADVANCE',
      status: 'ACTIVE',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      disbursementDate: new Date('2026-01-05T00:00:00.000Z'),
      repaymentAmount: 100,
      totalAmount: 1200,
      amountPaid: 300,
      amountDue: 900,
      message: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-06T00:00:00.000Z'),
      update: jest.fn().mockImplementation(async (values: Record<string, unknown>) => {
        Object.assign(loan, values);
      }),
    };

    mockTransaction(transactionToken);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);

    const result = await loanService.earlyMaturity(41, '2026-08-15');

    expect(LoanModel.findByPk).toHaveBeenCalledWith(41, { transaction: transactionToken });
    expect(loan.update).toHaveBeenCalledWith(
      {
        endDate: new Date('2026-08-15T00:00:00.000Z'),
        repaymentAmount: 900,
      },
      { transaction: transactionToken }
    );
    expect(result).toEqual({
      loan: expect.objectContaining({
        id: 41,
        endDate: '2026-08-15T00:00:00.000Z',
        repaymentAmount: 900,
      }),
      priorEndDate: '2026-12-31',
      newEndDate: '2026-08-15',
      priorRepaymentAmount: 100,
      newRepaymentAmount: 900,
    });
  });
});
