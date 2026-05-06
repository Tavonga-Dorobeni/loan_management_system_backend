import { QueryTypes } from 'sequelize';

import { sequelize } from '@/common/config/database.config';
import { NotFoundError } from '@/common/utils/errors';
import { LoanModel } from '@/modules/loans/model';
import {
  enumeratePeriods,
  getMonthLabel,
} from '@/modules/repayments/services/period';

type PortfolioMonthStatus = 'FULL' | 'PARTIAL' | 'UNPAID' | 'INACTIVE';
type LoanScheduleStatus = 'COVERED' | 'PARTIAL' | 'UNCOVERED';

interface ExpectedMonthRow {
  month: number;
  expected: string | number;
  activeLoanCount: string | number;
}

interface ReceivedMonthRow {
  month: number;
  received: string | number;
  repaymentCount: string | number;
}

interface YearRangeRow {
  minYear: number | string | null;
  maxYear: number | string | null;
}

interface LoanCoverageRow {
  year: number;
  month: number;
  cumulativeReceived: string | number;
}

export interface PortfolioScheduleMonthDto {
  month: number;
  label: string;
  expected: number;
  received: number;
  outstanding: number;
  activeLoanCount: number;
  repaymentCount: number;
  status: PortfolioMonthStatus;
}

export interface PortfolioScheduleResponseDto {
  year: number;
  nextPendingMonth: number | null;
  months: PortfolioScheduleMonthDto[];
  availableYears: number[];
}

export interface LoanScheduleSlotDto {
  year: number;
  month: number;
  status: LoanScheduleStatus;
  cumulativeReceived: number;
  expected: number;
}

const MONTH_SERIES_SQL = `
  SELECT 1 AS month
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
  UNION ALL SELECT 12
`;

const toNumber = (value: string | number | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value);

const buildAvailableYears = (minYear: number | null, maxYear: number | null): number[] => {
  if (!minYear || !maxYear || minYear > maxYear) {
    return [];
  }

  const years: number[] = [];
  for (let year = minYear; year <= maxYear; year += 1) {
    years.push(year);
  }
  return years;
};

export class RepaymentScheduleService {
  async getAnnualSchedule(year: number): Promise<PortfolioScheduleResponseDto> {
    const expectedRows = await sequelize.query<ExpectedMonthRow>(
      `
        SELECT
          months.month AS month,
          COALESCE(SUM(CAST(loans.repayment_amount AS DECIMAL(15, 2))), 0) AS expected,
          COUNT(loans.id) AS activeLoanCount
        FROM (${MONTH_SERIES_SQL}) months
        LEFT JOIN loans
          ON UPPER(loans.status) IN ('ACTIVE', 'SUCCESS')
         AND (
           YEAR(loans.start_date) < :year
           OR (YEAR(loans.start_date) = :year AND MONTH(loans.start_date) <= months.month)
         )
         AND (
           YEAR(loans.end_date) > :year
           OR (YEAR(loans.end_date) = :year AND MONTH(loans.end_date) >= months.month)
         )
        GROUP BY months.month
        ORDER BY months.month ASC
      `,
      {
        replacements: { year },
        type: QueryTypes.SELECT,
      }
    );

    const receivedRows = await sequelize.query<ReceivedMonthRow>(
      `
        SELECT
          period_month AS month,
          COALESCE(SUM(CAST(amount AS DECIMAL(15, 2))), 0) AS received,
          COUNT(*) AS repaymentCount
        FROM repayments
        WHERE period_year = :year
        GROUP BY period_month
        ORDER BY period_month ASC
      `,
      {
        replacements: { year },
        type: QueryTypes.SELECT,
      }
    );

    const [yearRange] = await sequelize.query<YearRangeRow>(
      `
        SELECT
          MIN(YEAR(start_date)) AS minYear,
          MAX(YEAR(end_date)) AS maxYear
        FROM loans
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    const receivedByMonth = new Map(
      receivedRows.map((row) => [
        Number(row.month),
        {
          received: toNumber(row.received),
          repaymentCount: Number(row.repaymentCount),
        },
      ])
    );

    const months = expectedRows.map<PortfolioScheduleMonthDto>((row) => {
      const month = Number(row.month);
      const expected = toNumber(row.expected);
      const receivedSummary = receivedByMonth.get(month) ?? {
        received: 0,
        repaymentCount: 0,
      };
      const received = receivedSummary.received;
      const outstanding = toNumber(
        Number(Math.max(0, expected - received).toFixed(2))
      );
      const activeLoanCount = Number(row.activeLoanCount);

      let status: PortfolioMonthStatus = 'UNPAID';
      if (activeLoanCount === 0) {
        status = 'INACTIVE';
      } else if (received >= expected && expected > 0) {
        status = 'FULL';
      } else if (received > 0) {
        status = 'PARTIAL';
      }

      return {
        month,
        label: getMonthLabel(month),
        expected,
        received,
        outstanding,
        activeLoanCount,
        repaymentCount: receivedSummary.repaymentCount,
        status,
      };
    });

    return {
      year,
      nextPendingMonth:
        months.find((month) => month.status === 'PARTIAL' || month.status === 'UNPAID')
          ?.month ?? null,
      months,
      availableYears: buildAvailableYears(
        yearRange?.minYear === null || yearRange?.minYear === undefined
          ? null
          : Number(yearRange.minYear),
        yearRange?.maxYear === null || yearRange?.maxYear === undefined
          ? null
          : Number(yearRange.maxYear)
      ),
    };
  }

  async getLoanSchedule(loanId: number): Promise<LoanScheduleSlotDto[]> {
    const loan = await LoanModel.findByPk(loanId);
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    const coverageRows = await sequelize.query<LoanCoverageRow>(
      `
        SELECT
          period_year AS year,
          period_month AS month,
          COALESCE(SUM(CAST(amount AS DECIMAL(15, 2))), 0) AS cumulativeReceived
        FROM repayments
        WHERE loan_id = :loanId
        GROUP BY period_year, period_month
        ORDER BY period_year ASC, period_month ASC
      `,
      {
        replacements: { loanId },
        type: QueryTypes.SELECT,
      }
    );

    const coverageByPeriod = new Map(
      coverageRows.map((row) => [
        `${Number(row.year)}-${Number(row.month)}`,
        toNumber(row.cumulativeReceived),
      ])
    );

    const expected = Number(loan.repaymentAmount);

    return enumeratePeriods(loan.startDate, loan.endDate).map((period) => {
      const cumulativeReceived =
        coverageByPeriod.get(`${period.year}-${period.month}`) ?? 0;

      let status: LoanScheduleStatus = 'UNCOVERED';
      if (cumulativeReceived >= expected && expected > 0) {
        status = 'COVERED';
      } else if (cumulativeReceived > 0) {
        status = 'PARTIAL';
      }

      return {
        year: period.year,
        month: period.month,
        status,
        cumulativeReceived,
        expected,
      };
    });
  }
}

export const repaymentScheduleService = new RepaymentScheduleService();
