import { Op } from 'sequelize';

import { KycDocumentTypes, kycDocumentTypeValues } from '@/common/types/kyc';
import { ActivityLogModel } from '@/modules/activity_logs/model';
import { BorrowerKycModel } from '@/modules/borrower_kyc/model';
import { BorrowerModel } from '@/modules/borrowers/model';
import { LoanModel } from '@/modules/loans/model';
import { RepaymentModel } from '@/modules/repayments/model';

export interface ReportQuery {
  format?: 'json' | 'csv' | 'xlsx';
  from?: string;
  to?: string;
  borrowerId?: number;
  loanId?: number;
  status?: string;
  type?: string;
}

export interface ReportResult {
  slug: string;
  rows: Record<string, unknown>[];
}

export interface DashboardRecentImport {
  type: 'intake' | 'approvals' | 'repayments' | string;
  at: string;
  success: number;
  failure: number;
}

export interface DashboardTrendPoint {
  date: string;
  count: number;
}

export interface PortfolioSummaryResult {
  totalActiveLoans: number;
  totalOutstandingAmountDue: number;
  totalAmountPaidInPeriod: number;
  overdueLoanCount: number;
  repaymentCollectionRate: number;
  incompleteKycCount: number;
  recentImports: DashboardRecentImport[];
  approvalTrend: DashboardTrendPoint[];
  repaymentTrend: DashboardTrendPoint[];
}

const buildDateRange = (
  from?: string,
  to?: string
): Record<PropertyKey, Date> | undefined => {
  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { [Op.gte]: new Date(from) } : {}),
    ...(to ? { [Op.lte]: new Date(to) } : {}),
  };
};

const buildBorrowerDocumentMap = async (): Promise<Map<number, Set<string>>> => {
  const documents = await BorrowerKycModel.findAll({
    attributes: ['borrowerId', 'documentType'],
  });

  return documents.reduce<Map<number, Set<string>>>((accumulator, document) => {
    const current = accumulator.get(document.borrowerId) ?? new Set<string>();
    current.add(document.documentType);
    accumulator.set(document.borrowerId, current);
    return accumulator;
  }, new Map<number, Set<string>>());
};

const getImportType = (action: string): DashboardRecentImport['type'] => {
  switch (action) {
    case 'loan.import.intake.completed':
      return 'intake';
    case 'loan.import.approval.completed':
      return 'approvals';
    case 'loan.import.repayment.completed':
      return 'repayments';
    default:
      return action;
  }
};

const readImportCount = (
  metadata: Record<string, unknown> | null | undefined,
  key: 'successCount' | 'failureCount'
): number => {
  return Number((metadata?.[key] as number | undefined) ?? 0);
};

const accumulateTrendCount = (
  trendMap: Map<string, DashboardTrendPoint>,
  date: string,
  count: number
): void => {
  const current = trendMap.get(date) ?? { date, count: 0 };
  current.count += count;
  trendMap.set(date, current);
};

export class ReportingService {
  async getPortfolioSummary(query: ReportQuery): Promise<PortfolioSummaryResult> {
    const repaymentDateRange = buildDateRange(query.from, query.to);
    const [loans, borrowers, repayments, recentImports, borrowerDocumentMap] =
      await Promise.all([
      LoanModel.findAll(),
      BorrowerModel.findAll(),
      RepaymentModel.findAll({
        where: repaymentDateRange ? { transactionDate: repaymentDateRange } : undefined,
      }),
      ActivityLogModel.findAll({
        where: {
          entityType: 'import',
        },
        order: [['createdAt', 'DESC']],
        limit: 10,
      }),
      buildBorrowerDocumentMap(),
    ]);

    const totalActiveLoans = loans.filter((loan) => Number(loan.amountDue ?? 0) > 0).length;
    const totalOutstandingAmountDue = Number(
      loans.reduce((sum, loan) => sum + Number(loan.amountDue ?? 0), 0).toFixed(2)
    );
    const totalAmountPaidInPeriod = Number(
      repayments.reduce((sum, repayment) => sum + Number(repayment.amount), 0).toFixed(2)
    );
    const overdueLoanCount = loans.filter(
      (loan) => Number(loan.amountDue ?? 0) > 0 && loan.endDate < new Date()
    ).length;
    const totalLoanBook = loans.reduce((sum, loan) => sum + Number(loan.totalAmount), 0);
    const totalAmountPaid = loans.reduce((sum, loan) => sum + Number(loan.amountPaid ?? 0), 0);
    const repaymentCollectionRate =
      totalLoanBook > 0 ? Number((totalAmountPaid / totalLoanBook).toFixed(4)) : 0;

    const incompleteKycCount = borrowers.filter((borrower) => {
      const documents = borrowerDocumentMap.get(borrower.id);
      return !documents || documents.size < kycDocumentTypeValues.length;
    }).length;

    const recentImportItems = recentImports.map((entry) => ({
      type: getImportType(entry.action),
      at: entry.createdAt.toISOString(),
      success: readImportCount(entry.metadata, 'successCount'),
      failure: readImportCount(entry.metadata, 'failureCount'),
    }));

    const approvalTrendMap = new Map<string, DashboardTrendPoint>();
    for (const entry of recentImports) {
      if (entry.action !== 'loan.import.approval.completed') {
        continue;
      }

      accumulateTrendCount(
        approvalTrendMap,
        entry.createdAt.toISOString().slice(0, 10),
        readImportCount(entry.metadata, 'successCount')
      );
    }

    const repaymentTrendMap = new Map<string, DashboardTrendPoint>();
    for (const repayment of repayments) {
      const date = repayment.transactionDate.toISOString().slice(0, 10);
      accumulateTrendCount(repaymentTrendMap, date, 1);
    }

    return {
      totalActiveLoans,
      totalOutstandingAmountDue,
      totalAmountPaidInPeriod,
      overdueLoanCount,
      repaymentCollectionRate,
      incompleteKycCount,
      recentImports: recentImportItems,
      approvalTrend: Array.from(approvalTrendMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
      repaymentTrend: Array.from(repaymentTrendMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    };
  }

  async getLoanPortfolio(query: ReportQuery): Promise<ReportResult> {
    const loans = await LoanModel.findAll({
      where: {
        ...(query.borrowerId ? { borrowerId: query.borrowerId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
    });
    const borrowers = await BorrowerModel.findAll();
    const borrowerById = new Map(borrowers.map((borrower) => [borrower.id, borrower]));

    return {
      slug: 'loan-portfolio',
      rows: loans.map((loan) => {
        const borrower = borrowerById.get(loan.borrowerId);
        return {
          referenceNumber: loan.referenceNumber,
          borrowerId: loan.borrowerId,
          borrowerName: borrower ? `${borrower.firstName} ${borrower.lastName}` : null,
          borrowerIdNumber: borrower?.idNumber ?? null,
          borrowerEcNumber: borrower?.ecNumber ?? null,
          type: loan.type,
          status: loan.status,
          startDate: loan.startDate.toISOString(),
          endDate: loan.endDate.toISOString(),
          repaymentAmount: Number(loan.repaymentAmount),
          totalAmount: Number(loan.totalAmount),
          amountPaid: Number(loan.amountPaid ?? 0),
          amountDue: Number(loan.amountDue ?? 0),
        };
      }),
    };
  }

  async getBorrowerRegister(): Promise<ReportResult> {
    const [borrowers, loans] = await Promise.all([
      BorrowerModel.findAll(),
      LoanModel.findAll(),
    ]);

    return {
      slug: 'borrower-register',
      rows: borrowers.map((borrower) => {
        const borrowerLoans = loans.filter((loan) => loan.borrowerId === borrower.id);
        return {
          borrowerId: borrower.id,
          firstName: borrower.firstName,
          lastName: borrower.lastName,
          idNumber: borrower.idNumber,
          ecNumber: borrower.ecNumber,
          phoneNumber: borrower.phoneNumber,
          email: borrower.email,
          loanCount: borrowerLoans.length,
          outstandingDue: Number(
            borrowerLoans.reduce((sum, loan) => sum + Number(loan.amountDue ?? 0), 0).toFixed(2)
          ),
        };
      }),
    };
  }

  async getKycCompleteness(): Promise<ReportResult> {
    const [borrowers, documents] = await Promise.all([
      BorrowerModel.findAll(),
      BorrowerKycModel.findAll(),
    ]);

    return {
      slug: 'kyc-completeness',
      rows: borrowers.map((borrower) => {
        const borrowerDocs = documents.filter((document) => document.borrowerId === borrower.id);
        const hasDocument = (documentType: KycDocumentTypes): boolean =>
          borrowerDocs.some((document) => document.documentType === documentType);

        return {
          borrowerId: borrower.id,
          borrowerName: `${borrower.firstName} ${borrower.lastName}`,
          idNumber: borrower.idNumber,
          ecNumber: borrower.ecNumber,
          payslip: hasDocument(KycDocumentTypes.PAYSLIP),
          nationalId: hasDocument(KycDocumentTypes.NATIONAL_ID),
          passportSizedPhoto: hasDocument(KycDocumentTypes.PASSPORT_SIZED_PHOTO),
          applicationForm: hasDocument(KycDocumentTypes.APPLICATION_FORM),
          complete: borrowerDocs.length >= kycDocumentTypeValues.length,
        };
      }),
    };
  }

  async getDisbursementReport(query: ReportQuery): Promise<ReportResult> {
    const loans = await LoanModel.findAll({
      where: {
        ...(query.status ? { status: query.status } : {}),
      },
    });

    return {
      slug: 'disbursement',
      rows: loans.map((loan) => ({
        referenceNumber: loan.referenceNumber,
        borrowerId: loan.borrowerId,
        status: loan.status,
        disbursementDate: loan.disbursementDate?.toISOString() ?? null,
        totalAmount: Number(loan.totalAmount),
        amountPaid: Number(loan.amountPaid ?? 0),
        amountDue: Number(loan.amountDue ?? 0),
      })),
    };
  }

  async getApprovalOutcomeReport(query: ReportQuery): Promise<ReportResult> {
    const loans = await LoanModel.findAll({
      where: {
        ...(query.status ? { status: query.status } : {}),
      },
    });

    return {
      slug: 'approval-outcome',
      rows: loans.map((loan) => ({
        referenceNumber: loan.referenceNumber,
        borrowerId: loan.borrowerId,
        status: loan.status,
        message: loan.message,
        amountDue: Number(loan.amountDue ?? 0),
        updatedAt: loan.updatedAt.toISOString(),
      })),
    };
  }

  async getRepaymentReport(query: ReportQuery): Promise<ReportResult> {
    const repayments = await RepaymentModel.findAll({
      where: {
        ...(query.loanId ? { loanId: query.loanId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(buildDateRange(query.from, query.to)
          ? { transactionDate: buildDateRange(query.from, query.to) }
          : {}),
      },
    });
    const loans = await LoanModel.findAll();
    const loanById = new Map(loans.map((loan) => [loan.id, loan]));

    return {
      slug: 'repayment',
      rows: repayments.map((repayment) => {
        const loan = loanById.get(repayment.loanId);
        return {
          repaymentId: repayment.id,
          referenceNumber: loan?.referenceNumber ?? null,
          loanId: repayment.loanId,
          amount: Number(repayment.amount),
          status: repayment.status,
          transactionDate: repayment.transactionDate.toISOString(),
        };
      }),
    };
  }

  async getArrearsReport(): Promise<ReportResult> {
    const loans = await LoanModel.findAll();
    const now = new Date();

    return {
      slug: 'arrears',
      rows: loans
        .filter((loan) => Number(loan.amountDue ?? 0) > 0 && loan.endDate < now)
        .map((loan) => ({
          referenceNumber: loan.referenceNumber,
          borrowerId: loan.borrowerId,
          status: loan.status,
          amountDue: Number(loan.amountDue ?? 0),
          daysOverdue: Math.max(
            0,
            Math.floor((now.getTime() - loan.endDate.getTime()) / (1000 * 60 * 60 * 24))
          ),
        })),
    };
  }

  async getCollectionsPerformance(): Promise<ReportResult> {
    const [loans, repayments] = await Promise.all([
      LoanModel.findAll(),
      RepaymentModel.findAll(),
    ]);

    return {
      slug: 'collections-performance',
      rows: loans.map((loan) => {
        const loanRepayments = repayments.filter((repayment) => repayment.loanId === loan.id);
        const totalCollected = Number(
          loanRepayments.reduce((sum, repayment) => sum + Number(repayment.amount), 0).toFixed(2)
        );
        const collectionRate =
          Number(loan.totalAmount) > 0
            ? Number(((totalCollected / Number(loan.totalAmount)) * 100).toFixed(2))
            : 0;

        return {
          referenceNumber: loan.referenceNumber,
          borrowerId: loan.borrowerId,
          repaymentCount: loanRepayments.length,
          totalCollected,
          totalAmount: Number(loan.totalAmount),
          amountDue: Number(loan.amountDue ?? 0),
          collectionRate,
        };
      }),
    };
  }

  async getImportExceptions(): Promise<ReportResult> {
    const importEvents = await ActivityLogModel.findAll({
      where: {
        entityType: 'import',
      },
      order: [['createdAt', 'DESC']],
    });

    return {
      slug: 'import-exceptions',
      rows: importEvents
        .filter((entry) => Number((entry.metadata?.failureCount as number | undefined) ?? 0) > 0)
        .map((entry) => ({
          action: entry.action,
          summary: entry.summary,
          sourceReference: entry.sourceReference,
          failureCount: Number((entry.metadata?.failureCount as number | undefined) ?? 0),
          successCount: Number((entry.metadata?.successCount as number | undefined) ?? 0),
          createdAt: entry.createdAt.toISOString(),
        })),
    };
  }
}

export const reportingService = new ReportingService();
