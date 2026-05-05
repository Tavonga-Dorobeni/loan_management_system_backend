import XLSX from 'xlsx';

import { sequelize } from '@/common/config/database.config';
import { Roles } from '@/common/types/roles';
import { LoanModel } from '@/modules/loans/model';
import { loanService } from '@/modules/loans/services/loan.service';
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
});
