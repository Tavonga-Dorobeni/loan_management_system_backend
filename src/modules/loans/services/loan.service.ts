import type {
  CreateLoanDto,
  LoanResponseDto,
  UpdateLoanDto,
} from '@/modules/loans/dto';
import type { BorrowerResponseDto } from '@/modules/borrowers/dto';
import type { RepaymentResponseDto } from '@/modules/repayments/dto';

import { Op } from 'sequelize';
import XLSX from 'xlsx';

import { sequelize } from '@/common/config/database.config';
import { ConflictError, ForbiddenError, NotFoundError } from '@/common/utils/errors';
import { buildListEnvelope, getOffset, type ListEnvelope } from '@/common/utils/list';
import type { Roles } from '@/common/types/roles';
import { activityLogService } from '@/modules/activity_logs/services/activity-log.service';
import { BorrowerModel } from '@/modules/borrowers/model';
import { LoanModel } from '@/modules/loans/model';
import { notificationService } from '@/modules/notifications/services/notification.service';
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

const toBorrowerSummary = (
  borrower: BorrowerModel
): BorrowerResponseDto => ({
  id: borrower.id,
  firstName: borrower.firstName,
  lastName: borrower.lastName,
  ecNumber: borrower.ecNumber,
  idNumber: borrower.idNumber,
  phoneNumber: borrower.phoneNumber,
  email: borrower.email,
  createdAt: borrower.createdAt.toISOString(),
  updatedAt: borrower.updatedAt.toISOString(),
});

const toRepaymentResponse = (
  repayment: RepaymentModel
): RepaymentResponseDto => ({
  id: repayment.id,
  loanId: repayment.loanId,
  amount: Number(repayment.amount),
  transactionDate: repayment.transactionDate.toISOString(),
  status: repayment.status,
  createdAt: repayment.createdAt.toISOString(),
  updatedAt: repayment.updatedAt.toISOString(),
});

interface LoanImportFailure {
  row: number;
  rowNumber: number;
  reference: string | null;
  error: string;
}

interface LoanImportSummary {
  totalRows: number;
  processedRows: number;
  successCount: number;
  failureCount: number;
  createdBorrowers: number;
  createdLoans: number;
  failedRows: LoanImportFailure[];
}

interface LoanApprovalImportSummary {
  totalRows: number;
  processedRows: number;
  successCount: number;
  failureCount: number;
  updatedLoans: number;
  failedRows: LoanImportFailure[];
}

interface LoanRepaymentImportSummary {
  totalRows: number;
  processedRows: number;
  successCount: number;
  failureCount: number;
  createdRepayments: number;
  failedRows: LoanImportFailure[];
}

export interface LoanListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  borrowerId?: number;
  status?: string;
  type?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
}

interface ActorContext {
  id: number;
  role: Roles;
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
  async list(query: LoanListQuery): Promise<ListEnvelope<LoanResponseDto>> {
    const where: Record<string, unknown> = {};

    if (query.borrowerId !== undefined) {
      where.borrowerId = query.borrowerId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.search) {
      where.referenceNumber = {
        [Op.like]: `%${query.search}%`,
      };
    }
    if (query.startDateFrom || query.startDateTo) {
      where.startDate = {
        ...(query.startDateFrom ? { [Op.gte]: new Date(query.startDateFrom) } : {}),
        ...(query.startDateTo ? { [Op.lte]: new Date(query.startDateTo) } : {}),
      };
    }
    if (query.endDateFrom || query.endDateTo) {
      where.endDate = {
        ...(query.endDateFrom ? { [Op.gte]: new Date(query.endDateFrom) } : {}),
        ...(query.endDateTo ? { [Op.lte]: new Date(query.endDateTo) } : {}),
      };
    }

    const { rows, count } = await LoanModel.findAndCountAll({
      where,
      order: [[query.sortBy ?? 'createdAt', query.sortOrder.toUpperCase()]],
      limit: query.pageSize,
      offset: getOffset(query.page, query.pageSize),
    });

    return buildListEnvelope(
      rows.map(toLoanResponse),
      query.page,
      query.pageSize,
      count
    );
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

  async update(
    loanId: number,
    payload: UpdateLoanDto,
    actorRole?: string
  ): Promise<LoanResponseDto> {
    const loan = await LoanModel.findByPk(loanId);
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    if (actorRole === 'credit_analyst') {
      const disallowedFields = [
        'borrowerId',
        'referenceNumber',
        'type',
        'startDate',
        'endDate',
        'disbursementDate',
        'repaymentAmount',
        'totalAmount',
        'amountPaid',
        'amountDue',
      ].filter((field) => payload[field as keyof UpdateLoanDto] !== undefined);

      if (disallowedFields.length > 0) {
        throw new ForbiddenError('Credit analysts can only update loan status and message');
      }
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

  async getDetails(loanId: number): Promise<{
    loan: LoanResponseDto;
    borrower: BorrowerResponseDto;
    balance: {
      amountPaid: number | null;
      amountDue: number | null;
      repaymentAmount: number;
    };
  }> {
    const loan = await LoanModel.findByPk(loanId);
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    const borrower = await BorrowerModel.findByPk(loan.borrowerId);
    if (!borrower) {
      throw new NotFoundError('Borrower not found');
    }

    return {
      loan: toLoanResponse(loan),
      borrower: toBorrowerSummary(borrower),
      balance: {
        amountPaid: toNumber(loan.amountPaid),
        amountDue: toNumber(loan.amountDue),
        repaymentAmount: Number(loan.repaymentAmount),
      },
    };
  }

  async listRepayments(
    loanId: number,
    query: {
      page: number;
      pageSize: number;
      sortBy?: string;
      sortOrder: 'asc' | 'desc';
      search?: string;
      status?: string;
      transactionDateFrom?: string;
      transactionDateTo?: string;
    }
  ): Promise<ListEnvelope<RepaymentResponseDto>> {
    const loan = await LoanModel.findByPk(loanId);
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    const where: Record<string, unknown> = {
      loanId,
    };
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

  async importFromExcel(
    file: Express.Multer.File,
    actor?: ActorContext
  ): Promise<LoanImportSummary> {
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
        successCount: 0,
        failureCount: 0,
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
      successCount: 0,
      failureCount: 0,
      createdBorrowers: 0,
      createdLoans: 0,
      failedRows: [],
    };

    for (let index = 0; index < dataRows.length; index += 1) {
      const row = (dataRows[index] ?? []) as unknown[];
      const rowNumber = index + 2;
      const referenceNumber = cellAsString(row[0]);

      const hasData = row.some((value: unknown) => cellAsString(value) !== '');
      if (!hasData) {
        continue;
      }

      try {
        await sequelize.transaction(async (transaction) => {
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
            await activityLogService.record({
              actorUserId: actor?.id,
              actorRole: actor?.role,
              entityType: 'borrower',
              entityId: borrower.id,
              action: 'borrower.created',
              summary: `${actor?.id ? `User #${actor.id}` : 'System'} created borrower ${borrower.firstName} ${borrower.lastName} via import`,
              metadata: {
                referenceNumber,
                rowNumber,
              },
              sourceType: 'import',
              sourceReference: file.originalname,
            });
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

          const createdLoan = await LoanModel.create(
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

          await activityLogService.record({
            actorUserId: actor?.id,
            actorRole: actor?.role,
            entityType: 'loan',
            entityId: createdLoan.id,
            action: 'loan.created',
            summary: `${actor?.id ? `User #${actor.id}` : 'System'} created loan ${createdLoan.referenceNumber} via import`,
            metadata: {
              referenceNumber: createdLoan.referenceNumber,
              rowNumber,
            },
            sourceType: 'import',
            sourceReference: file.originalname,
          });
          await notificationService.publish({
            eventType: 'loan.created',
            actorUserId: actor?.id,
            reference: createdLoan.referenceNumber,
            metadata: {
              loanId: createdLoan.id,
              referenceNumber: createdLoan.referenceNumber,
            },
          });

          summary.createdLoans += 1;
          summary.processedRows += 1;
          summary.successCount += 1;
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown import error';

        summary.failedRows.push({
          row: rowNumber,
          rowNumber,
          reference: referenceNumber || null,
          error: message,
        });
        summary.failureCount = summary.failedRows.length;
      }
    }

    return summary;
  }

  async importApprovalsFromExcel(
    file: Express.Multer.File,
    actor?: ActorContext
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
        successCount: 0,
        failureCount: 0,
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
      successCount: 0,
      failureCount: 0,
      updatedLoans: 0,
      failedRows: [],
    };

    for (let index = 0; index < dataRows.length; index += 1) {
      const row = (dataRows[index] ?? []) as unknown[];
      const rowNumber = index + 2;
      const referenceNumber = cellAsString(row[2]);

      const hasData = row.some((value: unknown) => cellAsString(value) !== '');
      if (!hasData) {
        continue;
      }

      try {
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

        const previousStatus = loan.status;
        await loan.update({
          status,
          message: messageValue || null,
          amountPaid: isSuccess ? 0 : loan.amountPaid,
          amountDue: computedAmountDue,
        });

        if (previousStatus !== status) {
          await activityLogService.record({
            actorUserId: actor?.id,
            actorRole: actor?.role,
            entityType: 'loan',
            entityId: loan.id,
            action: 'loan.status.changed',
            summary: `${actor?.id ? `User #${actor.id}` : 'System'} changed status of loan ${loan.referenceNumber} from ${previousStatus} to ${status} via import`,
            metadata: {
              from: previousStatus,
              to: status,
              rowNumber,
            },
            sourceType: 'import',
            sourceReference: file.originalname,
          });
          await notificationService.publish({
            eventType: 'loan.status.changed',
            actorUserId: actor?.id,
            reference: loan.referenceNumber,
            metadata: {
              loanId: loan.id,
              from: previousStatus,
              to: status,
            },
          });
        }

        summary.updatedLoans += 1;
        summary.processedRows += 1;
        summary.successCount += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown import error';

        summary.failedRows.push({
          row: rowNumber,
          rowNumber,
          reference: referenceNumber || null,
          error: message,
        });
        summary.failureCount = summary.failedRows.length;
      }
    }

    return summary;
  }

  async importRepaymentsFromExcel(
    file: Express.Multer.File,
    actor?: ActorContext
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
        successCount: 0,
        failureCount: 0,
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
      successCount: 0,
      failureCount: 0,
      createdRepayments: 0,
      failedRows: [],
    };

    for (let index = 0; index < dataRows.length; index += 1) {
      const row = (dataRows[index] ?? []) as unknown[];
      const rowNumber = index + 2;
      const referenceNumber = cellAsString(row[2]);

      const hasData = row.some((value: unknown) => cellAsString(value) !== '');
      if (!hasData) {
        continue;
      }

      try {
        await sequelize.transaction(async (transaction) => {
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

          const repayment = await RepaymentModel.create(
            {
              loanId: loan.id,
              amount,
              transactionDate,
              status: repaymentStatus,
            },
            { transaction }
          );

          await activityLogService.record({
            actorUserId: actor?.id,
            actorRole: actor?.role,
            entityType: 'repayment',
            entityId: repayment.id,
            action: 'repayment.created',
            summary: `${actor?.id ? `User #${actor.id}` : 'System'} created repayment for loan ${loan.referenceNumber} via import`,
            metadata: {
              amount,
              status: repaymentStatus,
              rowNumber,
            },
            sourceType: 'import',
            sourceReference: file.originalname,
          });
          if (repaymentStatus === 'UNDER') {
            await notificationService.publish({
              eventType: 'repayment.created.under',
              actorUserId: actor?.id,
              reference: loan.referenceNumber,
              metadata: {
                repaymentId: repayment.id,
                loanId: loan.id,
                amount,
              },
            });
          }

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
        summary.successCount += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown import error';

        summary.failedRows.push({
          row: rowNumber,
          rowNumber,
          reference: referenceNumber || null,
          error: message,
        });
        summary.failureCount = summary.failedRows.length;
      }
    }

    return summary;
  }
}

export const loanService = new LoanService();
