import type {
  CreateRepaymentDto,
  RepaymentResponseDto,
  UpdateRepaymentDto,
} from '@/modules/repayments/dto';

import { Op } from 'sequelize';

import { sequelize } from '@/common/config/database.config';
import {
  buildListEnvelope,
  getOffset,
  type ListEnvelope,
} from '@/common/utils/list';
import { NotFoundError } from '@/common/utils/errors';
import { LoanModel } from '@/modules/loans/model';
import { RepaymentModel } from '@/modules/repayments/model';

const toRepaymentResponse = (repayment: RepaymentModel): RepaymentResponseDto => ({
  id: repayment.id,
  loanId: repayment.loanId,
  amount: Number(repayment.amount),
  transactionDate: repayment.transactionDate.toISOString(),
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
      order: [[query.sortBy ?? 'createdAt', query.sortOrder.toUpperCase()]],
      limit: query.pageSize,
      offset: getOffset(query.page, query.pageSize),
    });

    return buildListEnvelope(
      rows.map(toRepaymentResponse),
      query.page,
      query.pageSize,
      count
    );
  }

  async getById(repaymentId: number): Promise<RepaymentResponseDto> {
    const repayment = await RepaymentModel.findByPk(repaymentId);
    if (!repayment) {
      throw new NotFoundError('Repayment not found');
    }

    return toRepaymentResponse(repayment);
  }

  async create(payload: CreateRepaymentDto): Promise<RepaymentResponseDto> {
    return sequelize.transaction(async (transaction) => {
      const loan = await LoanModel.findByPk(payload.loanId, { transaction });
      if (!loan) {
        throw new NotFoundError('Loan not found');
      }

      const repaymentStatus = deriveRepaymentStatus(
        payload.amount,
        Number(loan.repaymentAmount)
      );

      const repayment = await RepaymentModel.create(
        {
          loanId: payload.loanId,
          amount: payload.amount,
          transactionDate: new Date(payload.transactionDate),
          status: repaymentStatus,
        },
        { transaction }
      );

      await loan.update(
        {
          amountPaid: Number((Number(loan.amountPaid ?? 0) + payload.amount).toFixed(2)),
          amountDue: Number((Number(loan.amountDue ?? 0) - payload.amount).toFixed(2)),
        },
        { transaction }
      );

      return toRepaymentResponse(repayment);
    });
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

      const originalAmount = Number(repayment.amount);
      const nextAmount = payload.amount ?? originalAmount;
      const nextRepaymentStatus = deriveRepaymentStatus(
        nextAmount,
        Number(nextLoan.repaymentAmount)
      );

      await originalLoan.update(
        {
          amountPaid: Number((Number(originalLoan.amountPaid ?? 0) - originalAmount).toFixed(2)),
          amountDue: Number((Number(originalLoan.amountDue ?? 0) + originalAmount).toFixed(2)),
        },
        { transaction }
      );

      await nextLoan.update(
        {
          amountPaid: Number((Number(nextLoan.amountPaid ?? 0) + nextAmount).toFixed(2)),
          amountDue: Number((Number(nextLoan.amountDue ?? 0) - nextAmount).toFixed(2)),
        },
        { transaction }
      );

      await repayment.update(
        {
          loanId: nextLoanId,
          amount: nextAmount,
          transactionDate: payload.transactionDate
            ? new Date(payload.transactionDate)
            : repayment.transactionDate,
          status: nextRepaymentStatus,
        },
        { transaction }
      );

      return toRepaymentResponse(repayment);
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

      const amount = Number(repayment.amount);
      await loan.update(
        {
          amountPaid: Number((Number(loan.amountPaid ?? 0) - amount).toFixed(2)),
          amountDue: Number((Number(loan.amountDue ?? 0) + amount).toFixed(2)),
        },
        { transaction }
      );

      await repayment.destroy({ transaction });

      return {
        id: repaymentId,
        deleted: true,
      };
    });
  }
}

export const repaymentService = new RepaymentService();
