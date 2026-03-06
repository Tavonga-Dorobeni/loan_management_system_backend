import type {
  CreateLoanDto,
  LoanResponseDto,
  UpdateLoanDto,
} from '@/modules/loans/dto';

import { Op } from 'sequelize';
import XLSX from 'xlsx';

import { sequelize } from '@/common/config/database.config';
import { ConflictError, NotFoundError } from '@/common/utils/errors';
import { BorrowerModel } from '@/modules/borrowers/model';
import { LoanModel } from '@/modules/loans/model';
import { RepaymentModel } from '@/modules/repayments/model';

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

interface LoanImportFailure {
  row: number;
  error: string;
}

interface LoanImportSummary {
  totalRows: number;
  processedRows: number;
  createdBorrowers: number;
  createdLoans: number;
  failedRows: LoanImportFailure[];
}

interface LoanApprovalImportSummary {
  totalRows: number;
  processedRows: number;
  updatedLoans: number;
  failedRows: LoanImportFailure[];
}

interface LoanRepaymentImportSummary {
  totalRows: number;
  processedRows: number;
  createdRepayments: number;
  failedRows: LoanImportFailure[];
}

const cellAsString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const cellAsNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }

  const normalized = cellAsString(value).replace(/,/g, '');
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value "${normalized}"`);
  }

  return parsed;
};

const cellAsDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      throw new Error(`Invalid excel date value "${value}"`);
    }

    return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S);
  }

  const parsed = new Date(cellAsString(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value "${cellAsString(value)}"`);
  }

  return parsed;
};

const monthsBetweenDates = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    return 1;
  }

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  const monthAligned = new Date(start);
  monthAligned.setMonth(monthAligned.getMonth() + months);
  if (monthAligned < end) {
    months += 1;
  }

  return Math.max(1, months);
};

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

  async importFromExcel(file: Express.Multer.File): Promise<LoanImportSummary> {
    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
      cellDates: true,
      raw: true,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        totalRows: 0,
        processedRows: 0,
        createdBorrowers: 0,
        createdLoans: 0,
        failedRows: [],
      };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    const dataRows = rows.slice(1);
    const summary: LoanImportSummary = {
      totalRows: dataRows.length,
      processedRows: 0,
      createdBorrowers: 0,
      createdLoans: 0,
      failedRows: [],
    };

    for (let index = 0; index < dataRows.length; index += 1) {
      const row = (dataRows[index] ?? []) as unknown[];
      const rowNumber = index + 2;

      const hasData = row.some((value: unknown) => cellAsString(value) !== '');
      if (!hasData) {
        continue;
      }

      try {
        await sequelize.transaction(async (transaction) => {
          const referenceNumber = cellAsString(row[0]);
          const idNumber = cellAsString(row[1]);
          const ecNumber = cellAsString(row[2]);
          const loanType = cellAsString(row[3]);
          const startDate = cellAsDate(row[4]);
          const endDate = cellAsDate(row[5]);
          const repaymentAmount = cellAsNumber(row[6]) / 100;
          const totalAmount = cellAsNumber(row[8]) / 100;
          const firstName = cellAsString(row[9]);
          const lastName = cellAsString(row[10]);

          if (!referenceNumber) {
            throw new Error('Reference Number (column A) is required');
          }

          if (!idNumber && !ecNumber) {
            throw new Error('Either ID Number (column B) or EC Number (column C) is required');
          }

          let borrower = await BorrowerModel.findOne({
            where: {
              [Op.or]: [
                ...(idNumber ? [{ idNumber }] : []),
                ...(ecNumber ? [{ ecNumber }] : []),
              ],
            },
            transaction,
          });

          if (!borrower) {
            if (!idNumber || !ecNumber) {
              throw new Error(
                'Cannot create borrower without both ID Number (column B) and EC Number (column C)'
              );
            }

            borrower = await BorrowerModel.create(
              {
                firstName,
                lastName,
                idNumber,
                ecNumber,
                phoneNumber: null,
                email: null,
              },
              { transaction }
            );

            summary.createdBorrowers += 1;
          }

          const existingLoan = await LoanModel.findOne({
            where: {
              referenceNumber,
            },
            transaction,
          });

          if (existingLoan) {
            throw new Error(`Loan with reference number "${referenceNumber}" already exists`);
          }

          await LoanModel.create(
            {
              borrowerId: borrower.id,
              referenceNumber,
              type: loanType,
              status: 'PENDING',
              startDate,
              endDate,
              disbursementDate: null,
              repaymentAmount,
              totalAmount,
              amountPaid: null,
              amountDue: null,
              message: null,
            },
            { transaction }
          );

          summary.createdLoans += 1;
          summary.processedRows += 1;
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown import error';

        summary.failedRows.push({
          row: rowNumber,
          error: message,
        });
      }
    }

    return summary;
  }

  async importApprovalsFromExcel(
    file: Express.Multer.File
  ): Promise<LoanApprovalImportSummary> {
    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
      cellDates: true,
      raw: true,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        totalRows: 0,
        processedRows: 0,
        updatedLoans: 0,
        failedRows: [],
      };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    const dataRows = rows.slice(1);
    const summary: LoanApprovalImportSummary = {
      totalRows: dataRows.length,
      processedRows: 0,
      updatedLoans: 0,
      failedRows: [],
    };

    for (let index = 0; index < dataRows.length; index += 1) {
      const row = (dataRows[index] ?? []) as unknown[];
      const rowNumber = index + 2;

      const hasData = row.some((value: unknown) => cellAsString(value) !== '');
      if (!hasData) {
        continue;
      }

      try {
        const referenceNumber = cellAsString(row[2]);
        const status = cellAsString(row[6]);
        const messageValue = cellAsString(row[14]);

        if (!referenceNumber) {
          throw new Error('Reference Number (column C) is required');
        }

        if (!status) {
          throw new Error('Status (column G) is required');
        }

        const loan = await LoanModel.findOne({
          where: {
            referenceNumber,
          },
        });

        if (!loan) {
          throw new Error(`Loan with reference number "${referenceNumber}" was not found`);
        }

        const isSuccess = status.toUpperCase() === 'SUCCESS';
        const computedAmountDue = isSuccess
          ? Number((Number(loan.repaymentAmount) * monthsBetweenDates(loan.startDate, loan.endDate)).toFixed(2))
          : loan.amountDue;

        await loan.update({
          status,
          message: messageValue || null,
          amountPaid: isSuccess ? 0 : loan.amountPaid,
          amountDue: computedAmountDue,
        });

        summary.updatedLoans += 1;
        summary.processedRows += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown import error';

        summary.failedRows.push({
          row: rowNumber,
          error: message,
        });
      }
    }

    return summary;
  }

  async importRepaymentsFromExcel(
    file: Express.Multer.File
  ): Promise<LoanRepaymentImportSummary> {
    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
      cellDates: true,
      raw: true,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        totalRows: 0,
        processedRows: 0,
        createdRepayments: 0,
        failedRows: [],
      };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    const dataRows = rows.slice(1);
    const summary: LoanRepaymentImportSummary = {
      totalRows: dataRows.length,
      processedRows: 0,
      createdRepayments: 0,
      failedRows: [],
    };

    for (let index = 0; index < dataRows.length; index += 1) {
      const row = (dataRows[index] ?? []) as unknown[];
      const rowNumber = index + 2;

      const hasData = row.some((value: unknown) => cellAsString(value) !== '');
      if (!hasData) {
        continue;
      }

      try {
        await sequelize.transaction(async (transaction) => {
          const referenceNumber = cellAsString(row[2]);
          const transactionDate = cellAsDate(row[5]);
          const amount = cellAsNumber(row[6]);

          if (!referenceNumber) {
            throw new Error('Reference Number (column C) is required');
          }

          const loan = await LoanModel.findOne({
            where: {
              referenceNumber,
            },
            transaction,
          });

          if (!loan) {
            throw new Error(`Loan with reference number "${referenceNumber}" was not found`);
          }

          const expectedRepaymentAmount = Number(loan.repaymentAmount);
          let repaymentStatus = 'CORRECT';
          if (Math.abs(amount - expectedRepaymentAmount) > 0.000001) {
            repaymentStatus = amount > expectedRepaymentAmount ? 'OVER' : 'UNDER';
          }

          await RepaymentModel.create(
            {
              loanId: loan.id,
              amount,
              transactionDate,
              status: repaymentStatus,
            },
            { transaction }
          );

          const updatedAmountDue = Number((Number(loan.amountDue ?? 0) - amount).toFixed(2));
          const updatedAmountPaid = Number((Number(loan.amountPaid ?? 0) + amount).toFixed(2));

          await loan.update(
            {
              amountDue: updatedAmountDue,
              amountPaid: updatedAmountPaid,
            },
            { transaction }
          );
        });

        summary.createdRepayments += 1;
        summary.processedRows += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown import error';

        summary.failedRows.push({
          row: rowNumber,
          error: message,
        });
      }
    }

    return summary;
  }
}

export const loanService = new LoanService();
