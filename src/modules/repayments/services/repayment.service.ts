import type {
  CreateRepaymentDto,
  RepaymentResponseDto,
  UpdateRepaymentDto,
} from '@/modules/repayments/dto';

import { Op, type Transaction } from 'sequelize';

import { sequelize } from '@/common/config/database.config';
import {
  buildListEnvelope,
  getOffset,
  type ListEnvelope,
} from '@/common/utils/list';
import {
  NotFoundError,
  ValidationError,
} from '@/common/utils/errors';
import { LoanModel } from '@/modules/loans/model';
import { RepaymentModel } from '@/modules/repayments/model';
import {
  isPeriodWithinRange,
  isValidPeriodMonth,
} from '@/modules/repayments/services/period';

const PERIOD_ALREADY_COVERED_MESSAGE =
  'This period is already fully covered for this loan';

type RepaymentInputDate = string | Date;

interface RepaymentMutationPayload {
  loanId: number;
  amount: number;
  transactionDate: RepaymentInputDate;
  periodYear?: number;
  periodMonth?: number;
}

interface ValidatedRepaymentMutation {
  amount: number;
  transactionDate: Date;
  periodYear: number;
  periodMonth: number;
  status: string;
}

type RepaymentWithLoan = RepaymentModel & {
  loan?: Pick<LoanModel, 'referenceNumber'> | null;
};

const resolveLoanReference = (
  repayment: RepaymentWithLoan,
  loanReference?: string
): string => {
  const resolved = loanReference ?? repayment.loan?.referenceNumber;
  if (!resolved) {
    throw new NotFoundError('Loan not found');
  }

  return resolved;
};

const toRepaymentResponse = (
  repayment: RepaymentWithLoan,
  loanReference?: string
): RepaymentResponseDto => ({
  id: repayment.id,
  loanId: repayment.loanId,
  loanReference: resolveLoanReference(repayment, loanReference),
  amount: Number(repayment.amount),
  transactionDate: repayment.transactionDate.toISOString(),
  periodYear: repayment.periodYear,
  periodMonth: repayment.periodMonth,
  status: repayment.status,
  createdAt: repayment.createdAt.toISOString(),
  updatedAt: repayment.updatedAt.toISOString(),
});

const deriveRepaymentStatus = (amount: number, expectedRepaymentAmount: number): string => {
  if (Math.abs(amount - expectedRepaymentAmount) <= 0.000001) {
    return 'CORRECT';
  }

  return amount > expectedRepaymentAmount ? 'OVER' : 'UNDER';
};

const toRoundedNumber = (value: number): number => Number(value.toFixed(2));

const toTransactionDate = (value: RepaymentInputDate): Date => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('transactionDate must be a valid ISO-8601 date');
  }

  return parsed;
};

const normalizePeriod = (
  periodYear?: number,
  periodMonth?: number
): { periodYear: number; periodMonth: number } => {
  if (periodYear === undefined || periodMonth === undefined) {
    throw new ValidationError('periodYear and periodMonth are required');
  }

  if (!Number.isInteger(periodYear) || periodYear < 2000 || periodYear > 2100) {
    throw new ValidationError('periodYear must be between 2000 and 2100');
  }

  if (!isValidPeriodMonth(periodMonth)) {
    throw new ValidationError('periodMonth must be between 1 and 12');
  }

  return { periodYear, periodMonth };
};

const calculateLoanBalances = (
  amountPaid: number | null,
  amountDue: number | null,
  deltaAmount: number
): { amountPaid: number; amountDue: number } => ({
  amountPaid: toRoundedNumber(Number(amountPaid ?? 0) + deltaAmount),
  amountDue: toRoundedNumber(Number(amountDue ?? 0) - deltaAmount),
});

export interface RepaymentListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  loanId?: number;
  status?: string;
  transactionDateFrom?: string;
  transactionDateTo?: string;
  periodYear?: number;
  periodMonth?: number;
}

export class RepaymentService {
  async list(query: RepaymentListQuery): Promise<ListEnvelope<RepaymentResponseDto>> {
    const where: Record<string, unknown> = {};

    if (query.loanId !== undefined) {
      where.loanId = query.loanId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.periodYear !== undefined) {
      where.periodYear = query.periodYear;
    }
    if (query.periodMonth !== undefined) {
      where.periodMonth = query.periodMonth;
    }
    if (query.transactionDateFrom || query.transactionDateTo) {
      where.transactionDate = {
        ...(query.transactionDateFrom
          ? { [Op.gte]: new Date(query.transactionDateFrom) }
          : {}),
        ...(query.transactionDateTo
          ? { [Op.lte]: new Date(query.transactionDateTo) }
          : {}),
      };
    }

    const { rows, count } = await RepaymentModel.findAndCountAll({
      where,
      include: [
        {
          model: LoanModel,
          as: 'loan',
          attributes: ['referenceNumber'],
          required: true,
        },
      ],
      order: [[query.sortBy ?? 'createdAt', query.sortOrder.toUpperCase()]],
      limit: query.pageSize,
      offset: getOffset(query.page, query.pageSize),
    });

    return buildListEnvelope(
      rows.map((repayment) => toRepaymentResponse(repayment)),
      query.page,
      query.pageSize,
      count
    );
  }

  async getById(repaymentId: number): Promise<RepaymentResponseDto> {
    const repayment = await RepaymentModel.findByPk(repaymentId, {
      include: [
        {
          model: LoanModel,
          as: 'loan',
          attributes: ['referenceNumber'],
          required: true,
        },
      ],
    });
    if (!repayment) {
      throw new NotFoundError('Repayment not found');
    }

    return toRepaymentResponse(repayment);
  }

  async create(payload: CreateRepaymentDto): Promise<RepaymentResponseDto> {
    return sequelize.transaction(async (transaction) =>
      this.createInTransaction(
        {
          ...payload,
          transactionDate: payload.transactionDate,
        },
        transaction
      )
    );
  }

  async createInTransaction(
    payload: RepaymentMutationPayload,
    transaction: Transaction
  ): Promise<RepaymentResponseDto> {
    const loan = await LoanModel.findByPk(payload.loanId, { transaction });
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    const validated = await this.validateMutationPayload(
      payload,
      loan,
      transaction
    );

    const repayment = await RepaymentModel.create(
      {
        loanId: payload.loanId,
        amount: payload.amount,
        transactionDate: validated.transactionDate,
        periodYear: validated.periodYear,
        periodMonth: validated.periodMonth,
        status: validated.status,
      },
      { transaction }
    );

    await loan.update(
      calculateLoanBalances(loan.amountPaid, loan.amountDue, payload.amount),
      { transaction }
    );

    return toRepaymentResponse(repayment, loan.referenceNumber);
  }

  async update(
    repaymentId: number,
    payload: UpdateRepaymentDto
  ): Promise<RepaymentResponseDto> {
    return sequelize.transaction(async (transaction) => {
      const repayment = await RepaymentModel.findByPk(repaymentId, { transaction });
      if (!repayment) {
        throw new NotFoundError('Repayment not found');
      }

      const originalLoan = await LoanModel.findByPk(repayment.loanId, { transaction });
      if (!originalLoan) {
        throw new NotFoundError('Loan not found');
      }

      const nextLoanId = payload.loanId ?? repayment.loanId;
      const nextLoan =
        nextLoanId === repayment.loanId
          ? originalLoan
          : await LoanModel.findByPk(nextLoanId, { transaction });
      if (!nextLoan) {
        throw new NotFoundError('Loan not found');
      }

      const nextAmount = payload.amount ?? Number(repayment.amount);
      const validated = await this.validateMutationPayload(
        {
          loanId: nextLoanId,
          amount: nextAmount,
          transactionDate: payload.transactionDate ?? repayment.transactionDate,
          periodYear: payload.periodYear ?? repayment.periodYear,
          periodMonth: payload.periodMonth ?? repayment.periodMonth,
        },
        nextLoan,
        transaction,
        repayment.id
      );

      const originalAmount = Number(repayment.amount);

      if (nextLoanId === repayment.loanId) {
        await originalLoan.update(
          calculateLoanBalances(
            originalLoan.amountPaid,
            originalLoan.amountDue,
            nextAmount - originalAmount
          ),
          { transaction }
        );
      } else {
        await originalLoan.update(
          calculateLoanBalances(
            originalLoan.amountPaid,
            originalLoan.amountDue,
            -originalAmount
          ),
          { transaction }
        );

        await nextLoan.update(
          calculateLoanBalances(nextLoan.amountPaid, nextLoan.amountDue, nextAmount),
          { transaction }
        );
      }

      await repayment.update(
        {
          loanId: nextLoanId,
          amount: nextAmount,
          transactionDate: validated.transactionDate,
          periodYear: validated.periodYear,
          periodMonth: validated.periodMonth,
          status: validated.status,
        },
        { transaction }
      );

      return toRepaymentResponse(repayment, nextLoan.referenceNumber);
    });
  }

  async delete(repaymentId: number): Promise<{ id: number; deleted: boolean }> {
    return sequelize.transaction(async (transaction) => {
      const repayment = await RepaymentModel.findByPk(repaymentId, { transaction });
      if (!repayment) {
        throw new NotFoundError('Repayment not found');
      }

      const loan = await LoanModel.findByPk(repayment.loanId, { transaction });
      if (!loan) {
        throw new NotFoundError('Loan not found');
      }

      await loan.update(
        calculateLoanBalances(loan.amountPaid, loan.amountDue, -Number(repayment.amount)),
        { transaction }
      );

      await repayment.destroy({ transaction });

      return {
        id: repaymentId,
        deleted: true,
      };
    });
  }

  private async validateMutationPayload(
    payload: RepaymentMutationPayload,
    loan: LoanModel,
    transaction: Transaction,
    excludeRepaymentId?: number
  ): Promise<ValidatedRepaymentMutation> {
    const { periodYear, periodMonth } = normalizePeriod(
      payload.periodYear,
      payload.periodMonth
    );

    if (loan.status !== 'SUCCESS') {
      throw new ValidationError(
        'Repayments can only be recorded for loans with SUCCESS status'
      );
    }

    if (
      !isPeriodWithinRange(periodYear, periodMonth, loan.startDate, loan.endDate)
    ) {
      throw new ValidationError(
        'Selected repayment period is outside the loan schedule'
      );
    }

    const expectedRepaymentAmount = Number(loan.repaymentAmount);
    const existingCoverage = Number(
      (await RepaymentModel.sum('amount', {
        where: {
          loanId: loan.id,
          periodYear,
          periodMonth,
          ...(excludeRepaymentId
            ? {
                id: {
                  [Op.ne]: excludeRepaymentId,
                },
              }
            : {}),
        },
        transaction,
      })) ?? 0
    );

    if (existingCoverage + payload.amount > expectedRepaymentAmount + 0.000001) {
      throw new ValidationError(PERIOD_ALREADY_COVERED_MESSAGE);
    }

    return {
      amount: payload.amount,
      transactionDate: toTransactionDate(payload.transactionDate),
      periodYear,
      periodMonth,
      status: deriveRepaymentStatus(payload.amount, expectedRepaymentAmount),
    };
  }
}

export const repaymentService = new RepaymentService();
