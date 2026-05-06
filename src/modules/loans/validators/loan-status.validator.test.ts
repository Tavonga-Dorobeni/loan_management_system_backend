import { createLoanSchema } from '@/modules/loans/validators/create-loan.validator';
import { updateLoanSchema } from '@/modules/loans/validators/update-loan.validator';

describe('Loan status validators', () => {
  it('accepts WRITE-OFF on the update schema', () => {
    const { error, value } = updateLoanSchema.validate({
      status: 'WRITE-OFF',
      message: 'Board-approved write-off after settlement review',
    });

    expect(error).toBeUndefined();
    expect(value).toEqual({
      status: 'WRITE-OFF',
      message: 'Board-approved write-off after settlement review',
    });
  });

  it('accepts WRITE-OFF on the create schema', () => {
    const { error, value } = createLoanSchema.validate({
      borrowerId: 4,
      referenceNumber: 'LN-WO-NEW',
      type: 'SALARY_ADVANCE',
      status: 'WRITE-OFF',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      repaymentAmount: 100,
      totalAmount: 1200,
      message: 'Imported historical write-off',
    });

    expect(error).toBeUndefined();
    expect(value).toEqual(
      expect.objectContaining({
        borrowerId: 4,
        referenceNumber: 'LN-WO-NEW',
        type: 'SALARY_ADVANCE',
        status: 'WRITE-OFF',
        repaymentAmount: 100,
        totalAmount: 1200,
        message: 'Imported historical write-off',
      })
    );
  });
});
