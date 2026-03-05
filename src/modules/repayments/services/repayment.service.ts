import type {
  CreateRepaymentDto,
  RepaymentResponseDto,
  UpdateRepaymentDto,
} from '@/modules/repayments/dto';

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

export class RepaymentService {
  async list(): Promise<RepaymentResponseDto[]> {
    const repayments = await RepaymentModel.findAll({
      order: [['createdAt', 'DESC']],
    });

    return repayments.map(toRepaymentResponse);
  }

  async getById(repaymentId: number): Promise<RepaymentResponseDto> {
    const repayment = await RepaymentModel.findByPk(repaymentId);
    if (!repayment) {
      throw new NotFoundError('Repayment not found');
    }

    return toRepaymentResponse(repayment);
  }

  async create(payload: CreateRepaymentDto): Promise<RepaymentResponseDto> {
    const loan = await LoanModel.findByPk(payload.loanId);
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    const repayment = await RepaymentModel.create({
      loanId: payload.loanId,
      amount: payload.amount,
      transactionDate: new Date(payload.transactionDate),
      status: payload.status,
    });

    return toRepaymentResponse(repayment);
  }

  async update(
    repaymentId: number,
    payload: UpdateRepaymentDto
  ): Promise<RepaymentResponseDto> {
    const repayment = await RepaymentModel.findByPk(repaymentId);
    if (!repayment) {
      throw new NotFoundError('Repayment not found');
    }

    if (payload.loanId !== undefined) {
      const loan = await LoanModel.findByPk(payload.loanId);
      if (!loan) {
        throw new NotFoundError('Loan not found');
      }
    }

    await repayment.update({
      loanId: payload.loanId ?? repayment.loanId,
      amount: payload.amount ?? repayment.amount,
      transactionDate: payload.transactionDate
        ? new Date(payload.transactionDate)
        : repayment.transactionDate,
      status: payload.status ?? repayment.status,
    });

    return toRepaymentResponse(repayment);
  }

  async delete(repaymentId: number): Promise<{ id: number; deleted: boolean }> {
    const repayment = await RepaymentModel.findByPk(repaymentId);
    if (!repayment) {
      throw new NotFoundError('Repayment not found');
    }

    await repayment.destroy();

    return {
      id: repaymentId,
      deleted: true,
    };
  }
}

export const repaymentService = new RepaymentService();
