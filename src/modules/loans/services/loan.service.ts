import type {
  CreateLoanDto,
  LoanResponseDto,
  UpdateLoanDto,
} from '@/modules/loans/dto';

import { ConflictError, NotFoundError } from '@/common/utils/errors';
import { BorrowerModel } from '@/modules/borrowers/model';
import { LoanModel } from '@/modules/loans/model';

const toNumber = (value: number | string | null): number | null => {
  if (value === null) {
    return null;
  }

  return Number(value);
};

const toLoanResponse = (loan: LoanModel): LoanResponseDto => ({
  id: loan.id,
  borrowerId: loan.borrowerId,
  referenceNumber: loan.referenceNumber,
  type: loan.type,
  status: loan.status,
  startDate: loan.startDate.toISOString(),
  endDate: loan.endDate.toISOString(),
  disbursementDate: loan.disbursementDate ? loan.disbursementDate.toISOString() : null,
  repaymentAmount: Number(loan.repaymentAmount),
  totalAmount: Number(loan.totalAmount),
  amountPaid: toNumber(loan.amountPaid),
  amountDue: toNumber(loan.amountDue),
  message: loan.message,
  createdAt: loan.createdAt.toISOString(),
  updatedAt: loan.updatedAt.toISOString(),
});

export class LoanService {
  async list(): Promise<LoanResponseDto[]> {
    const loans = await LoanModel.findAll({
      order: [['createdAt', 'DESC']],
    });

    return loans.map(toLoanResponse);
  }

  async getById(loanId: number): Promise<LoanResponseDto> {
    const loan = await LoanModel.findByPk(loanId);
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    return toLoanResponse(loan);
  }

  async create(payload: CreateLoanDto): Promise<LoanResponseDto> {
    const borrower = await BorrowerModel.findByPk(payload.borrowerId);
    if (!borrower) {
      throw new NotFoundError('Borrower not found');
    }

    const existing = await LoanModel.findOne({
      where: {
        referenceNumber: payload.referenceNumber,
      },
    });

    if (existing) {
      throw new ConflictError('A loan with this reference number already exists');
    }

    const loan = await LoanModel.create({
      borrowerId: payload.borrowerId,
      referenceNumber: payload.referenceNumber,
      type: payload.type,
      status: payload.status,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      disbursementDate: payload.disbursementDate
        ? new Date(payload.disbursementDate)
        : null,
      repaymentAmount: payload.repaymentAmount,
      totalAmount: payload.totalAmount,
      amountPaid: payload.amountPaid ?? null,
      amountDue: payload.amountDue ?? null,
      message: payload.message ?? null,
    });

    return toLoanResponse(loan);
  }

  async update(loanId: number, payload: UpdateLoanDto): Promise<LoanResponseDto> {
    const loan = await LoanModel.findByPk(loanId);
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    if (payload.borrowerId !== undefined) {
      const borrower = await BorrowerModel.findByPk(payload.borrowerId);
      if (!borrower) {
        throw new NotFoundError('Borrower not found');
      }
    }

    if (
      payload.referenceNumber &&
      payload.referenceNumber !== loan.referenceNumber
    ) {
      const existing = await LoanModel.findOne({
        where: {
          referenceNumber: payload.referenceNumber,
        },
      });

      if (existing) {
        throw new ConflictError('A loan with this reference number already exists');
      }
    }

    await loan.update({
      borrowerId: payload.borrowerId ?? loan.borrowerId,
      referenceNumber: payload.referenceNumber ?? loan.referenceNumber,
      type: payload.type ?? loan.type,
      status: payload.status ?? loan.status,
      startDate: payload.startDate ? new Date(payload.startDate) : loan.startDate,
      endDate: payload.endDate ? new Date(payload.endDate) : loan.endDate,
      disbursementDate:
        payload.disbursementDate !== undefined
          ? payload.disbursementDate
            ? new Date(payload.disbursementDate)
            : null
          : loan.disbursementDate,
      repaymentAmount: payload.repaymentAmount ?? loan.repaymentAmount,
      totalAmount: payload.totalAmount ?? loan.totalAmount,
      amountPaid: payload.amountPaid !== undefined ? payload.amountPaid : loan.amountPaid,
      amountDue: payload.amountDue !== undefined ? payload.amountDue : loan.amountDue,
      message: payload.message !== undefined ? payload.message : loan.message,
    });

    return toLoanResponse(loan);
  }

  async delete(loanId: number): Promise<{ id: number; deleted: boolean }> {
    const loan = await LoanModel.findByPk(loanId);
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    await loan.destroy();

    return {
      id: loanId,
      deleted: true,
    };
  }
}

export const loanService = new LoanService();
