import { Op } from 'sequelize';

import { sequelize } from '@/common/config/database.config';
import { LoanModel } from '@/modules/loans/model';
import { RepaymentModel } from '@/modules/repayments/model';
import { repaymentService } from '@/modules/repayments/services/repayment.service';

const mockTransaction = (transactionToken: never): void => {
  jest
    .spyOn(sequelize, 'transaction')
    .mockImplementation((async (...args: unknown[]) => {
      const callback = typeof args[0] === 'function' ? args[0] : args[1];
      return (callback as (transaction: never) => unknown)(transactionToken);
    }) as never);
};

const createLoanStub = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 3,
  referenceNumber: 'LN-003',
  status: 'ACTIVE',
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  endDate: new Date('2026-06-01T00:00:00.000Z'),
  repaymentAmount: 100,
  amountPaid: 40,
  amountDue: 260,
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('RepaymentService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('derives repayment status and mutates loan balances on create', async () => {
    const transactionToken = {} as never;
    const loan = createLoanStub();
    const createdRepayment = {
      id: 11,
      loanId: 3,
      amount: 100,
      transactionDate: new Date('2026-04-18T00:00:00.000Z'),
      periodYear: 2026,
      periodMonth: 4,
      status: 'CORRECT',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    };

    mockTransaction(transactionToken);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);
    jest.spyOn(RepaymentModel, 'sum').mockResolvedValue(0 as never);
    jest.spyOn(RepaymentModel, 'create').mockResolvedValue(createdRepayment as never);

    const result = await repaymentService.create({
      loanId: 3,
      amount: 100,
      transactionDate: '2026-04-18T00:00:00.000Z',
      periodYear: 2026,
      periodMonth: 4,
    });

    expect(RepaymentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId: 3,
        amount: 100,
        periodYear: 2026,
        periodMonth: 4,
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
    expect(result).toMatchObject({
      status: 'CORRECT',
      loanReference: 'LN-003',
    });
  });

  it('allows top-ups while the cumulative period total is still below the expected repayment', async () => {
    const transactionToken = {} as never;
    const loan = createLoanStub();
    const createdRepayment = {
      id: 12,
      loanId: 3,
      amount: 60,
      transactionDate: new Date('2026-04-18T00:00:00.000Z'),
      periodYear: 2026,
      periodMonth: 4,
      status: 'UNDER',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    };

    mockTransaction(transactionToken);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);
    jest.spyOn(RepaymentModel, 'sum').mockResolvedValue(40 as never);
    jest.spyOn(RepaymentModel, 'create').mockResolvedValue(createdRepayment as never);

    const result = await repaymentService.create({
      loanId: 3,
      amount: 60,
      transactionDate: '2026-04-18T00:00:00.000Z',
      periodYear: 2026,
      periodMonth: 4,
    });

    expect(result).toMatchObject({
      status: 'UNDER',
      loanReference: 'LN-003',
    });
    expect(loan.update).toHaveBeenCalledWith(
      {
        amountPaid: 100,
        amountDue: 200,
      },
      { transaction: transactionToken }
    );
  });

  it('marks a loan as MATURED when a repayment clears the outstanding balance', async () => {
    const transactionToken = {} as never;
    const loan = createLoanStub({
      amountPaid: 200,
      amountDue: 60,
    });
    const createdRepayment = {
      id: 14,
      loanId: 3,
      amount: 60,
      transactionDate: new Date('2026-04-18T00:00:00.000Z'),
      periodYear: 2026,
      periodMonth: 4,
      status: 'UNDER',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    };

    mockTransaction(transactionToken);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);
    jest.spyOn(RepaymentModel, 'sum').mockResolvedValue(40 as never);
    jest.spyOn(RepaymentModel, 'create').mockResolvedValue(createdRepayment as never);

    await repaymentService.create({
      loanId: 3,
      amount: 60,
      transactionDate: '2026-04-18T00:00:00.000Z',
      periodYear: 2026,
      periodMonth: 4,
    });

    expect(loan.update).toHaveBeenCalledWith(
      {
        amountPaid: 260,
        amountDue: 0,
        status: 'MATURED',
      },
      { transaction: transactionToken }
    );
  });

  it('rejects repayments for periods that are already fully covered', async () => {
    const transactionToken = {} as never;
    const loan = createLoanStub();

    mockTransaction(transactionToken);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);
    jest.spyOn(RepaymentModel, 'sum').mockResolvedValue(100 as never);

    await expect(
      repaymentService.create({
        loanId: 3,
        amount: 1,
        transactionDate: '2026-04-18T00:00:00.000Z',
        periodYear: 2026,
        periodMonth: 4,
      })
    ).rejects.toThrow('This period is already fully covered for this loan');
  });

  it('rejects repayment periods that fall outside the loan schedule', async () => {
    const transactionToken = {} as never;
    const loan = createLoanStub();

    mockTransaction(transactionToken);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);

    await expect(
      repaymentService.create({
        loanId: 3,
        amount: 50,
        transactionDate: '2026-07-01T00:00:00.000Z',
        periodYear: 2026,
        periodMonth: 7,
      })
    ).rejects.toThrow('Selected repayment period is outside the loan schedule');
  });

  it('rethrows create failures so the transaction can roll back', async () => {
    const transactionToken = {} as never;
    const loan = createLoanStub({
      amountPaid: 0,
      amountDue: 300,
      update: jest.fn().mockRejectedValue(new Error('loan update failed')),
    });
    const createdRepayment = {
      id: 13,
      loanId: 4,
      amount: 50,
      transactionDate: new Date('2026-04-18T00:00:00.000Z'),
      periodYear: 2026,
      periodMonth: 4,
      status: 'UNDER',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    };

    mockTransaction(transactionToken);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);
    jest.spyOn(RepaymentModel, 'sum').mockResolvedValue(0 as never);
    jest.spyOn(RepaymentModel, 'create').mockResolvedValue(createdRepayment as never);

    await expect(
      repaymentService.create({
        loanId: 4,
        amount: 50,
        transactionDate: '2026-04-18T00:00:00.000Z',
        periodYear: 2026,
        periodMonth: 4,
      })
    ).rejects.toThrow('loan update failed');

    expect(RepaymentModel.create).toHaveBeenCalled();
    expect(loan.update).toHaveBeenCalled();
  });

  it('includes the joined loan reference in repayment list rows', async () => {
    const repayment = {
      id: 21,
      loanId: 3,
      loan: {
        referenceNumber: 'LN-003',
      },
      amount: 100,
      transactionDate: new Date('2026-04-18T00:00:00.000Z'),
      periodYear: 2026,
      periodMonth: 4,
      status: 'CORRECT',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    };

    jest.spyOn(RepaymentModel, 'findAndCountAll').mockResolvedValue({
      rows: [repayment],
      count: 1,
    } as never);

    const result = await repaymentService.list({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });

    expect(RepaymentModel.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        include: [
          expect.objectContaining({
            as: 'loan',
            attributes: ['referenceNumber'],
            required: true,
          }),
        ],
      })
    );
    expect(result.items[0]).toMatchObject({
      id: 21,
      loanId: 3,
      loanReference: 'LN-003',
    });
  });

  it('includes the joined loan reference in single repayment reads', async () => {
    const repayment = {
      id: 22,
      loanId: 4,
      loan: {
        referenceNumber: 'LN-004',
      },
      amount: 90,
      transactionDate: new Date('2026-05-18T00:00:00.000Z'),
      periodYear: 2026,
      periodMonth: 5,
      status: 'UNDER',
      createdAt: new Date('2026-05-19T00:00:00.000Z'),
      updatedAt: new Date('2026-05-19T00:00:00.000Z'),
    };

    jest.spyOn(RepaymentModel, 'findByPk').mockResolvedValue(repayment as never);

    const result = await repaymentService.getById(22);

    expect(RepaymentModel.findByPk).toHaveBeenCalledWith(22, {
      include: [
        expect.objectContaining({
          as: 'loan',
          attributes: ['referenceNumber'],
          required: true,
        }),
      ],
    });
    expect(result).toMatchObject({
      id: 22,
      loanId: 4,
      loanReference: 'LN-004',
    });
  });

  it('recomputes balances and excludes the current row from top-up coverage checks on update', async () => {
    const transactionToken = {} as never;
    const loan = createLoanStub({
      id: 3,
      amountPaid: 140,
      amountDue: 160,
    });
    const repayment = {
      id: 11,
      loanId: 3,
      amount: 100,
      transactionDate: new Date('2026-04-18T00:00:00.000Z'),
      periodYear: 2026,
      periodMonth: 4,
      status: 'CORRECT',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
      update: jest.fn().mockImplementation(async (values: Record<string, unknown>) => {
        Object.assign(repayment, values);
      }),
    };

    mockTransaction(transactionToken);
    jest.spyOn(RepaymentModel, 'findByPk').mockResolvedValue(repayment as never);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);
    jest.spyOn(RepaymentModel, 'sum').mockResolvedValue(0 as never);

    const result = await repaymentService.update(11, {
      amount: 80,
      periodYear: 2026,
      periodMonth: 4,
    });

    expect(RepaymentModel.sum).toHaveBeenCalledWith('amount', {
      where: {
        loanId: 3,
        periodYear: 2026,
        periodMonth: 4,
        id: {
          [Op.ne]: 11,
        },
      },
      transaction: transactionToken,
    });
    expect(loan.update).toHaveBeenCalledWith(
      {
        amountPaid: 120,
        amountDue: 180,
      },
      { transaction: transactionToken }
    );
    expect(repayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 80,
        periodYear: 2026,
        periodMonth: 4,
        status: 'UNDER',
      }),
      { transaction: transactionToken }
    );
    expect(result).toMatchObject({
      status: 'UNDER',
      loanReference: 'LN-003',
    });
  });

  it('allows repayment updates on matured loans and reactivates them if the balance becomes positive again', async () => {
    const transactionToken = {} as never;
    const loan = createLoanStub({
      status: 'MATURED',
      amountPaid: 300,
      amountDue: 0,
    });
    const repayment = {
      id: 15,
      loanId: 3,
      amount: 100,
      transactionDate: new Date('2026-04-18T00:00:00.000Z'),
      periodYear: 2026,
      periodMonth: 4,
      status: 'CORRECT',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
      update: jest.fn().mockImplementation(async (values: Record<string, unknown>) => {
        Object.assign(repayment, values);
      }),
    };

    mockTransaction(transactionToken);
    jest.spyOn(RepaymentModel, 'findByPk').mockResolvedValue(repayment as never);
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue(loan as never);
    jest.spyOn(RepaymentModel, 'sum').mockResolvedValue(0 as never);

    await repaymentService.update(15, {
      amount: 80,
      periodYear: 2026,
      periodMonth: 4,
    });

    expect(loan.update).toHaveBeenCalledWith(
      {
        amountPaid: 280,
        amountDue: 20,
        status: 'ACTIVE',
      },
      { transaction: transactionToken }
    );
  });

  it('reverses the loan balance when a repayment is deleted', async () => {
    const transactionToken = {} as never;
    const loan = createLoanStub({
      amountPaid: 140,
      amountDue: 160,
      update: jest.fn().mockResolvedValue(undefined),
    });
    const repayment = {
      id: 11,
      loanId: 3,
      amount: 100,
      periodYear: 2026,
      periodMonth: 4,
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    mockTransaction(transactionToken);
    jest.spyOn(RepaymentModel, 'findByPk').mockResolvedValue(repayment as never);
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
