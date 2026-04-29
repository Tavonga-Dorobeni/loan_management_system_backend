import { sequelize } from '@/common/config/database.config';
import { repaymentService } from '@/modules/repayments/services/repayment.service';
import { LoanModel } from '@/modules/loans/model';
import { RepaymentModel } from '@/modules/repayments/model';

const mockTransaction = (transactionToken: never): void => {
  jest
    .spyOn(sequelize, 'transaction')
    .mockImplementation((async (...args: unknown[]) => {
      const callback =
        typeof args[0] === 'function' ? args[0] : args[1];
      return (callback as (transaction: never) => unknown)(transactionToken);
    }) as never);
};

describe('RepaymentService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('derives repayment status and mutates loan balances on create', async () => {
    const transactionToken = {} as never;
    const loan = {
      repaymentAmount: 100,
      amountPaid: 40,
      amountDue: 260,
      update: jest.fn().mockResolvedValue(undefined),
    };
    const createdRepayment = {
      id: 11,
      loanId: 3,
      amount: 100,
      transactionDate: new Date('2026-04-18T00:00:00.000Z'),
      status: 'CORRECT',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    };

    mockTransaction(transactionToken);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);
    jest
      .spyOn(RepaymentModel, 'create')
      .mockResolvedValue(createdRepayment as never);

    const result = await repaymentService.create({
      loanId: 3,
      amount: 100,
      transactionDate: '2026-04-18T00:00:00.000Z',
    });

    expect(RepaymentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId: 3,
        amount: 100,
        status: 'CORRECT',
      }),
      { transaction: transactionToken }
    );
    expect(loan.update).toHaveBeenCalledWith(
      {
        amountPaid: 140,
        amountDue: 160,
      },
      { transaction: transactionToken }
    );
    expect(result.status).toBe('CORRECT');
  });

  it('rethrows create failures so the transaction can roll back', async () => {
    const transactionToken = {} as never;
    const loan = {
      repaymentAmount: 75,
      amountPaid: 0,
      amountDue: 300,
      update: jest.fn().mockRejectedValue(new Error('loan update failed')),
    };
    const createdRepayment = {
      id: 12,
      loanId: 4,
      amount: 50,
      transactionDate: new Date('2026-04-18T00:00:00.000Z'),
      status: 'UNDER',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    };

    mockTransaction(transactionToken);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);
    jest
      .spyOn(RepaymentModel, 'create')
      .mockResolvedValue(createdRepayment as never);

    await expect(
      repaymentService.create({
        loanId: 4,
        amount: 50,
        transactionDate: '2026-04-18T00:00:00.000Z',
      })
    ).rejects.toThrow('loan update failed');

    expect(RepaymentModel.create).toHaveBeenCalled();
    expect(loan.update).toHaveBeenCalled();
  });

  it('reverses balances and derives the new status on update', async () => {
    const transactionToken = {} as never;
    const loan = {
      id: 3,
      repaymentAmount: 100,
      amountPaid: 140,
      amountDue: 160,
      update: jest.fn().mockResolvedValue(undefined),
    };
    const repayment = {
      id: 11,
      loanId: 3,
      amount: 100,
      transactionDate: new Date('2026-04-18T00:00:00.000Z'),
      status: 'CORRECT',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
      update: jest.fn().mockImplementation(async (values: Record<string, unknown>) => {
        Object.assign(repayment, values);
      }),
    };

    mockTransaction(transactionToken);
    jest
      .spyOn(RepaymentModel, 'findByPk')
      .mockResolvedValue(repayment as never);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);

    const result = await repaymentService.update(11, {
      amount: 120,
    });

    expect(loan.update).toHaveBeenNthCalledWith(
      1,
      {
        amountPaid: 40,
        amountDue: 260,
      },
      { transaction: transactionToken }
    );
    expect(loan.update).toHaveBeenNthCalledWith(
      2,
      {
        amountPaid: 260,
        amountDue: 40,
      },
      { transaction: transactionToken }
    );
    expect(repayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 120,
        status: 'OVER',
      }),
      { transaction: transactionToken }
    );
    expect(result.status).toBe('OVER');
  });

  it('reverses the loan balance when a repayment is deleted', async () => {
    const transactionToken = {} as never;
    const loan = {
      amountPaid: 140,
      amountDue: 160,
      update: jest.fn().mockResolvedValue(undefined),
    };
    const repayment = {
      id: 11,
      loanId: 3,
      amount: 100,
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    mockTransaction(transactionToken);
    jest
      .spyOn(RepaymentModel, 'findByPk')
      .mockResolvedValue(repayment as never);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);

    const result = await repaymentService.delete(11);

    expect(loan.update).toHaveBeenCalledWith(
      {
        amountPaid: 40,
        amountDue: 260,
      },
      { transaction: transactionToken }
    );
    expect(repayment.destroy).toHaveBeenCalledWith({ transaction: transactionToken });
    expect(result).toEqual({
      id: 11,
      deleted: true,
    });
  });
});
