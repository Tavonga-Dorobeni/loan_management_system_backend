import { Op, QueryTypes } from 'sequelize';

import { sequelize } from '@/common/config/database.config';
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
  month?: string;
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

export interface DashboardMonthCountPoint {
  month: string;
  count: number;
}

export interface DashboardMonthAmountPoint {
  month: string;
  amount: number;
}

export interface DashboardTopInstallment {
  loanId: number | string;
  referenceNumber: string;
  repaymentAmount: number;
  endDate: string;
  borrower: {
    id: number | string;
    ecNumber: string;
    firstName: string;
    lastName: string;
  };
}

export interface PortfolioSummaryResult {
  totalActiveLoans: number;
  totalOutstandingAmountDue: number;
  totalAmountPaidInPeriod: number;
  overdueLoanCount: number;
  repaymentCollectionRate: number;
  incompleteKycCount: number;
  monthlyCollectionsExpected: number;
  averageMonthlyInstallment: number;
  totalLoansOnBook: number;
  newThisYear: number;
  maturedClosedCount: number;
  activeRate: number;
  totalLoanBookSize: number;
  averageLoanSize: number;
  principalMaturingThisMonth: number;
  principalMaturingNext3Months: number;
  par30Rate: number;
  par90Rate: number;
  missingDataCount: number;
  maturityByMonth: DashboardMonthCountPoint[];
  actualCollectionsByMonth: DashboardMonthAmountPoint[];
  topActiveInstallments: DashboardTopInstallment[];
  recentImports: DashboardRecentImport[];
  approvalTrend: DashboardTrendPoint[];
  repaymentTrend: DashboardTrendPoint[];
}

interface LoanAggregateRow {
  totalActiveLoans: string | number | null;
  totalOutstandingAmountDue: string | number | null;
  totalAmountPaidAll: string | number | null;
  totalLoanBookAll: string | number | null;
  overdueLoanCount: string | number | null;
  monthlyCollectionsExpected: string | number | null;
  averageMonthlyInstallment: string | number | null;
  totalLoansOnBook: string | number | null;
  newThisYear: string | number | null;
  maturedClosedCount: string | number | null;
  totalLoanBookSize: string | number | null;
  averageLoanSize: string | number | null;
  principalMaturingThisMonth: string | number | null;
  principalMaturingNext3Months: string | number | null;
  par30Count: string | number | null;
  par90Count: string | number | null;
  missingDataCount: string | number | null;
}

interface TotalPaidRow {
  totalAmountPaidInPeriod: string | number | null;
}

interface RepaymentTrendRow {
  date: string | Date;
  count: string | number;
}

interface IncompleteKycRow {
  incompleteKycCount: string | number | null;
}

interface DashboardMonthCountRow {
  month: string;
  count: string | number;
}

interface DashboardMonthAmountRow {
  month: string;
  amount: string | number;
}

interface TopActiveInstallmentRow {
  loanId: string | number;
  referenceNumber: string;
  repaymentAmount: string | number;
  endDate: string | Date;
  borrowerId: string | number;
  borrowerEcNumber: string;
  borrowerFirstName: string;
  borrowerLastName: string;
}

const MONTH_OFFSET_SERIES_SQL = `
  SELECT 0 AS monthOffset
  UNION ALL SELECT 1
  UNION ALL SELECT 2
  UNION ALL SELECT 3
  UNION ALL SELECT 4
  UNION ALL SELECT 5
  UNION ALL SELECT 6
  UNION ALL SELECT 7
  UNION ALL SELECT 8
  UNION ALL SELECT 9
  UNION ALL SELECT 10
  UNION ALL SELECT 11
`;

const ACTIVE_LOAN_STATUS = 'ACTIVE';
const MATURED_LOAN_STATUS = 'MATURED';
const DASHBOARD_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

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

const buildRepaymentWhereClause = (
  from?: string,
  to?: string
): { sql: string; replacements: Record<string, Date> } => {
  const clauses: string[] = [];
  const replacements: Record<string, Date> = {};

  if (from) {
    clauses.push('transaction_date >= :repaymentFrom');
    replacements.repaymentFrom = new Date(from);
  }
  if (to) {
    clauses.push('transaction_date <= :repaymentTo');
    replacements.repaymentTo = new Date(to);
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    replacements,
  };
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

const toNumber = (value: string | number | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value);

const toCurrencyAmount = (value: string | number | null | undefined): number =>
  Number(toNumber(value).toFixed(2));

const toRate = (numerator: number, denominator: number): number =>
  denominator > 0 ? Number((numerator / denominator).toFixed(4)) : 0;

const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const startOfUtcMonth = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const addUtcDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const addUtcMonths = (date: Date, months: number): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));

const resolveDashboardMonthStart = (
  month: string | undefined,
  fallbackMonthStart: Date
): Date => {
  if (!month) {
    return fallbackMonthStart;
  }

  const match = DASHBOARD_MONTH_PATTERN.exec(month);
  if (!match) {
    throw new Error(`Invalid dashboard month: ${month}`);
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
};

const toIsoDateString = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.length >= 10 ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
};

const toIsoDateTime = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const zoned = /Z$|[+-]\d{2}:\d{2}$/.test(normalized)
    ? normalized
    : `${normalized}Z`;
  return new Date(zoned).toISOString();
};

export class ReportingService {
  async getPortfolioSummary(query: ReportQuery): Promise<PortfolioSummaryResult> {
    const now = new Date();
    const todayStart = startOfUtcDay(now);
    const currentMonthStart = startOfUtcMonth(now);
    const currentMonthEnd = addUtcMonths(currentMonthStart, 1);
    const selectedMonthStart = resolveDashboardMonthStart(query.month, currentMonthStart);
    const selectedMonthEnd = addUtcMonths(selectedMonthStart, 1);
    const nextThreeMonthsUpperBound = addUtcDays(addUtcMonths(todayStart, 3), 1);
    const maturityStartMonth = currentMonthStart;
    const collectionsStartMonth = addUtcMonths(currentMonthStart, -11);
    const repaymentWhere = buildRepaymentWhereClause(query.from, query.to);

    const [
      loanAggregateRows,
      totalPaidRows,
      repaymentTrendRows,
      recentImports,
      incompleteKycRows,
      maturityByMonthRows,
      actualCollectionsByMonthRows,
      topActiveInstallmentRows,
    ] = await Promise.all([
      sequelize.query<LoanAggregateRow>(
        `
          SELECT
            COUNT(*) AS totalLoansOnBook,
            COALESCE(SUM(CAST(total_amount AS DECIMAL(15, 2))), 0) AS totalLoanBookAll,
            COALESCE(SUM(CAST(amount_paid AS DECIMAL(15, 2))), 0) AS totalAmountPaidAll,
            COALESCE(SUM(CASE WHEN status = :activeStatus THEN 1 ELSE 0 END), 0) AS totalActiveLoans,
            COALESCE(SUM(CASE WHEN status = :activeStatus THEN CAST(amount_due AS DECIMAL(15, 2)) ELSE 0 END), 0) AS totalOutstandingAmountDue,
            COALESCE(SUM(CASE WHEN status = :activeStatus AND start_date < :selectedMonthEnd AND end_date >= :selectedMonthStart THEN CAST(repayment_amount AS DECIMAL(15, 2)) ELSE 0 END), 0) AS monthlyCollectionsExpected,
            COALESCE(AVG(CASE WHEN status = :activeStatus THEN CAST(repayment_amount AS DECIMAL(15, 2)) END), 0) AS averageMonthlyInstallment,
            COALESCE(SUM(CASE WHEN YEAR(created_at) = :currentYear THEN 1 ELSE 0 END), 0) AS newThisYear,
            COALESCE(SUM(CASE WHEN status = :maturedStatus THEN 1 ELSE 0 END), 0) AS maturedClosedCount,
            COALESCE(SUM(CASE WHEN status = :activeStatus THEN CAST(total_amount AS DECIMAL(15, 2)) ELSE 0 END), 0) AS totalLoanBookSize,
            COALESCE(AVG(CASE WHEN status = :activeStatus THEN CAST(total_amount AS DECIMAL(15, 2)) END), 0) AS averageLoanSize,
            COALESCE(SUM(CASE WHEN status = :activeStatus AND end_date >= :currentMonthStart AND end_date < :currentMonthEnd THEN CAST(total_amount AS DECIMAL(15, 2)) ELSE 0 END), 0) AS principalMaturingThisMonth,
            COALESCE(SUM(CASE WHEN status = :activeStatus AND end_date >= :todayStart AND end_date < :nextThreeMonthsUpperBound THEN CAST(total_amount AS DECIMAL(15, 2)) ELSE 0 END), 0) AS principalMaturingNext3Months,
            COALESCE(SUM(CASE WHEN status = :activeStatus AND end_date < :todayStart THEN 1 ELSE 0 END), 0) AS overdueLoanCount,
            COALESCE(SUM(CASE WHEN status = :activeStatus AND DATEDIFF(:todayStart, end_date) BETWEEN 30 AND 89 THEN 1 ELSE 0 END), 0) AS par30Count,
            COALESCE(SUM(CASE WHEN status = :activeStatus AND DATEDIFF(:todayStart, end_date) >= 90 THEN 1 ELSE 0 END), 0) AS par90Count,
            COALESCE(SUM(CASE WHEN status = :activeStatus AND (repayment_amount IS NULL OR CAST(repayment_amount AS DECIMAL(15, 2)) = 0) THEN 1 ELSE 0 END), 0) AS missingDataCount
          FROM loans
        `,
        {
          replacements: {
            activeStatus: ACTIVE_LOAN_STATUS,
            currentYear: todayStart.getUTCFullYear(),
            currentMonthStart,
            currentMonthEnd,
            maturedStatus: MATURED_LOAN_STATUS,
            selectedMonthStart,
            selectedMonthEnd,
            todayStart,
            nextThreeMonthsUpperBound,
          },
          type: QueryTypes.SELECT,
        }
      ),
      sequelize.query<TotalPaidRow>(
        `
          SELECT
            COALESCE(SUM(CAST(amount AS DECIMAL(15, 2))), 0) AS totalAmountPaidInPeriod
          FROM repayments
          ${repaymentWhere.sql}
        `,
        {
          replacements: repaymentWhere.replacements,
          type: QueryTypes.SELECT,
        }
      ),
      sequelize.query<RepaymentTrendRow>(
        `
          SELECT
            DATE(transaction_date) AS date,
            COUNT(*) AS count
          FROM repayments
          ${repaymentWhere.sql}
          GROUP BY DATE(transaction_date)
          ORDER BY DATE(transaction_date) ASC
        `,
        {
          replacements: repaymentWhere.replacements,
          type: QueryTypes.SELECT,
        }
      ),
      ActivityLogModel.findAll({
        where: {
          entityType: 'import',
        },
        order: [['createdAt', 'DESC']],
        limit: 10,
      }),
      sequelize.query<IncompleteKycRow>(
        `
          SELECT
            COUNT(*) AS incompleteKycCount
          FROM borrowers
          LEFT JOIN (
            SELECT
              borrower_id AS borrowerId,
              COUNT(DISTINCT document_type) AS documentCount
            FROM borrower_kyc
            GROUP BY borrower_id
          ) documents
            ON documents.borrowerId = borrowers.id
          WHERE COALESCE(documents.documentCount, 0) < :requiredDocumentCount
        `,
        {
          replacements: {
            requiredDocumentCount: kycDocumentTypeValues.length,
          },
          type: QueryTypes.SELECT,
        }
      ),
      sequelize.query<DashboardMonthCountRow>(
        `
          SELECT
            DATE_FORMAT(DATE_ADD(:maturityStartMonth, INTERVAL offsets.monthOffset MONTH), '%Y-%m') AS month,
            COUNT(loans.id) AS count
          FROM (${MONTH_OFFSET_SERIES_SQL}) offsets
          LEFT JOIN loans
            ON loans.status = :activeStatus
           AND loans.end_date >= DATE_ADD(:maturityStartMonth, INTERVAL offsets.monthOffset MONTH)
           AND loans.end_date < DATE_ADD(DATE_ADD(:maturityStartMonth, INTERVAL offsets.monthOffset MONTH), INTERVAL 1 MONTH)
          GROUP BY month
          ORDER BY month ASC
        `,
        {
          replacements: {
            activeStatus: ACTIVE_LOAN_STATUS,
            maturityStartMonth,
          },
          type: QueryTypes.SELECT,
        }
      ),
      sequelize.query<DashboardMonthAmountRow>(
        `
          SELECT
            DATE_FORMAT(DATE_ADD(:collectionsStartMonth, INTERVAL offsets.monthOffset MONTH), '%Y-%m') AS month,
            COALESCE(SUM(CAST(repayments.amount AS DECIMAL(15, 2))), 0) AS amount
          FROM (${MONTH_OFFSET_SERIES_SQL}) offsets
          LEFT JOIN repayments
            ON repayments.transaction_date >= DATE_ADD(:collectionsStartMonth, INTERVAL offsets.monthOffset MONTH)
           AND repayments.transaction_date < DATE_ADD(DATE_ADD(:collectionsStartMonth, INTERVAL offsets.monthOffset MONTH), INTERVAL 1 MONTH)
          GROUP BY month
          ORDER BY month ASC
        `,
        {
          replacements: {
            collectionsStartMonth,
          },
          type: QueryTypes.SELECT,
        }
      ),
      sequelize.query<TopActiveInstallmentRow>(
        `
          SELECT
            loans.id AS loanId,
            loans.reference_number AS referenceNumber,
            CAST(loans.repayment_amount AS DECIMAL(15, 2)) AS repaymentAmount,
            loans.end_date AS endDate,
            borrowers.id AS borrowerId,
            borrowers.ec_number AS borrowerEcNumber,
            borrowers.first_name AS borrowerFirstName,
            borrowers.last_name AS borrowerLastName
          FROM loans
          INNER JOIN borrowers
            ON borrowers.id = loans.borrower_id
          WHERE loans.status = :activeStatus
          ORDER BY CAST(loans.repayment_amount AS DECIMAL(15, 2)) DESC, loans.id ASC
          LIMIT 10
        `,
        {
          replacements: {
            activeStatus: ACTIVE_LOAN_STATUS,
          },
          type: QueryTypes.SELECT,
        }
      ),
    ]);

    const loanAggregate = loanAggregateRows[0];
    const totalActiveLoans = Number(loanAggregate?.totalActiveLoans ?? 0);
    const totalLoansOnBook = Number(loanAggregate?.totalLoansOnBook ?? 0);
    const par30Count = Number(loanAggregate?.par30Count ?? 0);
    const par90Count = Number(loanAggregate?.par90Count ?? 0);
    const totalLoanBookAll = toCurrencyAmount(loanAggregate?.totalLoanBookAll);
    const totalAmountPaidAll = toCurrencyAmount(loanAggregate?.totalAmountPaidAll);
    const incompleteKycCount = Number(incompleteKycRows[0]?.incompleteKycCount ?? 0);
    const totalAmountPaidInPeriod = toCurrencyAmount(
      totalPaidRows[0]?.totalAmountPaidInPeriod
    );

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

    return {
      totalActiveLoans,
      totalOutstandingAmountDue: toCurrencyAmount(loanAggregate?.totalOutstandingAmountDue),
      totalAmountPaidInPeriod,
      overdueLoanCount: Number(loanAggregate?.overdueLoanCount ?? 0),
      repaymentCollectionRate: toRate(totalAmountPaidAll, totalLoanBookAll),
      incompleteKycCount,
      monthlyCollectionsExpected: toCurrencyAmount(loanAggregate?.monthlyCollectionsExpected),
      averageMonthlyInstallment: toCurrencyAmount(
        loanAggregate?.averageMonthlyInstallment
      ),
      totalLoansOnBook,
      newThisYear: Number(loanAggregate?.newThisYear ?? 0),
      maturedClosedCount: Number(loanAggregate?.maturedClosedCount ?? 0),
      activeRate: toRate(totalActiveLoans, totalLoansOnBook),
      totalLoanBookSize: toCurrencyAmount(loanAggregate?.totalLoanBookSize),
      averageLoanSize: toCurrencyAmount(loanAggregate?.averageLoanSize),
      principalMaturingThisMonth: toCurrencyAmount(
        loanAggregate?.principalMaturingThisMonth
      ),
      principalMaturingNext3Months: toCurrencyAmount(
        loanAggregate?.principalMaturingNext3Months
      ),
      par30Rate: toRate(par30Count, totalActiveLoans),
      par90Rate: toRate(par90Count, totalActiveLoans),
      missingDataCount: Number(loanAggregate?.missingDataCount ?? 0),
      maturityByMonth: maturityByMonthRows.map((row) => ({
        month: row.month,
        count: Number(row.count),
      })),
      actualCollectionsByMonth: actualCollectionsByMonthRows.map((row) => ({
        month: row.month,
        amount: toCurrencyAmount(row.amount),
      })),
      topActiveInstallments: topActiveInstallmentRows.map((row) => ({
        loanId: Number(row.loanId),
        referenceNumber: row.referenceNumber,
        repaymentAmount: toCurrencyAmount(row.repaymentAmount),
        endDate: toIsoDateTime(row.endDate),
        borrower: {
          id: Number(row.borrowerId),
          ecNumber: row.borrowerEcNumber,
          firstName: row.borrowerFirstName,
          lastName: row.borrowerLastName,
        },
      })),
      recentImports: recentImportItems,
      approvalTrend: Array.from(approvalTrendMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
      repaymentTrend: repaymentTrendRows
        .map((row) => ({
          date: toIsoDateString(row.date),
          count: Number(row.count),
        }))
        .sort((a, b) =>
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
