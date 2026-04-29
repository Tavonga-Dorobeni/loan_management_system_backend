import { ActivityLogModel } from '@/modules/activity_logs/model';
import { BorrowerKycModel } from '@/modules/borrower_kyc/model';
import { BorrowerModel } from '@/modules/borrowers/model';
import { LoanModel } from '@/modules/loans/model';
import { RepaymentModel } from '@/modules/repayments/model';
import { reportingService } from '@/modules/reports/services/reporting.service';

describe('ReportingService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the canonical dashboard summary shape', async () => {
    jest.spyOn(LoanModel, 'findAll').mockResolvedValue([
      {
        id: 1,
        amountDue: 250,
        totalAmount: 1000,
        amountPaid: 500,
        endDate: new Date('2000-01-01T00:00:00.000Z'),
      },
      {
        id: 2,
        amountDue: 0,
        totalAmount: 500,
        amountPaid: 250,
        endDate: new Date('2999-01-01T00:00:00.000Z'),
      },
    ] as never);
    jest.spyOn(BorrowerModel, 'findAll').mockResolvedValue([
      { id: 1 },
      { id: 2 },
    ] as never);
    jest.spyOn(RepaymentModel, 'findAll').mockResolvedValue([
      {
        amount: 100,
        transactionDate: new Date('2026-04-18T00:00:00.000Z'),
      },
      {
        amount: 250,
        transactionDate: new Date('2026-04-18T12:00:00.000Z'),
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
    jest.spyOn(BorrowerKycModel, 'findAll').mockResolvedValue([
      {
        borrowerId: 1,
        documentType: 'payslip',
      },
    ] as never);

    const summary = await reportingService.getPortfolioSummary({
      from: '2026-04-01',
      to: '2026-04-30',
    });

    expect(summary).toEqual({
      totalActiveLoans: 1,
      totalOutstandingAmountDue: 250,
      totalAmountPaidInPeriod: 350,
      overdueLoanCount: 1,
      repaymentCollectionRate: 0.5,
      incompleteKycCount: 2,
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
      ],
    });
  });
});
