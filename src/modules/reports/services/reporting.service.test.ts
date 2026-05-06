import { sequelize } from '@/common/config/database.config';
import { ActivityLogModel } from '@/modules/activity_logs/model';
import { reportingService } from '@/modules/reports/services/reporting.service';

const buildPortfolioSummaryMocks = (
  overrides: {
    loanAggregate?: Record<string, string>;
  } = {}
) => {
  const querySpy = jest.spyOn(sequelize, 'query');

  querySpy
    .mockResolvedValueOnce([
      {
        totalActiveLoans: '2',
        totalOutstandingAmountDue: '650.00',
        totalAmountPaidAll: '750.00',
        totalLoanBookAll: '2500.00',
        overdueLoanCount: '1',
        monthlyCollectionsExpected: '325.00',
        averageMonthlyInstallment: '162.50',
        totalLoansOnBook: '3',
        newThisYear: '2',
        maturedClosedCount: '1',
        totalLoanBookSize: '2200.00',
        averageLoanSize: '1100.00',
        principalMaturingThisMonth: '500.00',
        principalMaturingNext3Months: '1500.00',
        par30Count: '1',
        par90Count: '0',
        missingDataCount: '1',
        ...overrides.loanAggregate,
      },
    ] as never)
    .mockResolvedValueOnce([{ totalAmountPaidInPeriod: '350.00' }] as never)
    .mockResolvedValueOnce([
      { date: '2026-04-18', count: '2' },
      { date: '2026-04-20', count: '1' },
    ] as never)
    .mockResolvedValueOnce([{ incompleteKycCount: '2' }] as never)
    .mockResolvedValueOnce([
      { month: '2026-05', count: '2' },
      { month: '2026-06', count: '1' },
      { month: '2026-07', count: '0' },
      { month: '2026-08', count: '3' },
      { month: '2026-09', count: '1' },
      { month: '2026-10', count: '0' },
      { month: '2026-11', count: '0' },
      { month: '2026-12', count: '4' },
      { month: '2027-01', count: '0' },
      { month: '2027-02', count: '1' },
      { month: '2027-03', count: '0' },
      { month: '2027-04', count: '2' },
    ] as never)
    .mockResolvedValueOnce([
      { month: '2025-06', amount: '0.00' },
      { month: '2025-07', amount: '150.00' },
      { month: '2025-08', amount: '0.00' },
      { month: '2025-09', amount: '200.00' },
      { month: '2025-10', amount: '0.00' },
      { month: '2025-11', amount: '50.00' },
      { month: '2025-12', amount: '0.00' },
      { month: '2026-01', amount: '300.00' },
      { month: '2026-02', amount: '0.00' },
      { month: '2026-03', amount: '100.00' },
      { month: '2026-04', amount: '350.00' },
      { month: '2026-05', amount: '400.00' },
    ] as never)
    .mockResolvedValueOnce([
      {
        loanId: '10',
        referenceNumber: 'LN-010',
        repaymentAmount: '250.00',
        endDate: '2026-05-31 00:00:00',
        borrowerId: '100',
        borrowerEcNumber: 'EC100',
        borrowerFirstName: 'Tariro',
        borrowerLastName: 'Moyo',
      },
      {
        loanId: '11',
        referenceNumber: 'LN-011',
        repaymentAmount: '200.00',
        endDate: '2026-08-15 00:00:00',
        borrowerId: '101',
        borrowerEcNumber: 'EC101',
        borrowerFirstName: 'Nyasha',
        borrowerLastName: 'Dube',
      },
    ] as never);

  jest.spyOn(ActivityLogModel, 'findAll').mockResolvedValue([
    {
      action: 'loan.import.repayment.completed',
      createdAt: new Date('2026-04-22T10:00:00.000Z'),
      metadata: { successCount: 2, failureCount: 1 },
    },
    {
      action: 'loan.import.approval.completed',
      createdAt: new Date('2026-04-21T10:00:00.000Z'),
      metadata: { successCount: 3, failureCount: 0 },
    },
    {
      action: 'loan.import.intake.completed',
      createdAt: new Date('2026-04-20T10:00:00.000Z'),
      metadata: { successCount: 4, failureCount: 1 },
    },
  ] as never);

  return querySpy;
};

describe('ReportingService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the canonical dashboard summary shape', async () => {
    buildPortfolioSummaryMocks();

    const summary = await reportingService.getPortfolioSummary({
      from: '2026-04-01',
      to: '2026-04-30',
    });

    expect(summary).toEqual({
      totalActiveLoans: 2,
      totalOutstandingAmountDue: 650,
      totalAmountPaidInPeriod: 350,
      overdueLoanCount: 1,
      repaymentCollectionRate: 0.3,
      incompleteKycCount: 2,
      monthlyCollectionsExpected: 325,
      averageMonthlyInstallment: 162.5,
      totalLoansOnBook: 3,
      newThisYear: 2,
      maturedClosedCount: 1,
      activeRate: 0.6667,
      totalLoanBookSize: 2200,
      averageLoanSize: 1100,
      principalMaturingThisMonth: 500,
      principalMaturingNext3Months: 1500,
      par30Rate: 0.5,
      par90Rate: 0,
      missingDataCount: 1,
      maturityByMonth: [
        { month: '2026-05', count: 2 },
        { month: '2026-06', count: 1 },
        { month: '2026-07', count: 0 },
        { month: '2026-08', count: 3 },
        { month: '2026-09', count: 1 },
        { month: '2026-10', count: 0 },
        { month: '2026-11', count: 0 },
        { month: '2026-12', count: 4 },
        { month: '2027-01', count: 0 },
        { month: '2027-02', count: 1 },
        { month: '2027-03', count: 0 },
        { month: '2027-04', count: 2 },
      ],
      actualCollectionsByMonth: [
        { month: '2025-06', amount: 0 },
        { month: '2025-07', amount: 150 },
        { month: '2025-08', amount: 0 },
        { month: '2025-09', amount: 200 },
        { month: '2025-10', amount: 0 },
        { month: '2025-11', amount: 50 },
        { month: '2025-12', amount: 0 },
        { month: '2026-01', amount: 300 },
        { month: '2026-02', amount: 0 },
        { month: '2026-03', amount: 100 },
        { month: '2026-04', amount: 350 },
        { month: '2026-05', amount: 400 },
      ],
      topActiveInstallments: [
        {
          loanId: 10,
          referenceNumber: 'LN-010',
          repaymentAmount: 250,
          endDate: '2026-05-31T00:00:00.000Z',
          borrower: {
            id: 100,
            ecNumber: 'EC100',
            firstName: 'Tariro',
            lastName: 'Moyo',
          },
        },
        {
          loanId: 11,
          referenceNumber: 'LN-011',
          repaymentAmount: 200,
          endDate: '2026-08-15T00:00:00.000Z',
          borrower: {
            id: 101,
            ecNumber: 'EC101',
            firstName: 'Nyasha',
            lastName: 'Dube',
          },
        },
      ],
      recentImports: [
        {
          type: 'repayments',
          at: '2026-04-22T10:00:00.000Z',
          success: 2,
          failure: 1,
        },
        {
          type: 'approvals',
          at: '2026-04-21T10:00:00.000Z',
          success: 3,
          failure: 0,
        },
        {
          type: 'intake',
          at: '2026-04-20T10:00:00.000Z',
          success: 4,
          failure: 1,
        },
      ],
      approvalTrend: [
        {
          date: '2026-04-21',
          count: 3,
        },
      ],
      repaymentTrend: [
        {
          date: '2026-04-18',
          count: 2,
        },
        {
          date: '2026-04-20',
          count: 1,
        },
      ],
    });
  });

  it('uses the optional month query to scope monthly collections to one calendar month', async () => {
    const querySpy = buildPortfolioSummaryMocks({
      loanAggregate: {
        monthlyCollectionsExpected: '410.00',
      },
    });

    const summary = await reportingService.getPortfolioSummary({
      month: '2027-02',
    });

    expect(summary.monthlyCollectionsExpected).toBe(410);
    expect(querySpy.mock.calls[0]?.[0]).toContain('status = :maturedStatus');
    expect(querySpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        'status = :activeStatus AND start_date < :selectedMonthEnd AND end_date >= :selectedMonthStart'
      ),
      expect.objectContaining({
        replacements: expect.objectContaining({
          activeStatus: 'ACTIVE',
          maturedStatus: 'MATURED',
          selectedMonthStart: new Date(Date.UTC(2027, 1, 1)),
          selectedMonthEnd: new Date(Date.UTC(2027, 2, 1)),
        }),
      })
    );
  });
});
