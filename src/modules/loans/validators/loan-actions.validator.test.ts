import { earlyMaturityLoanSchema, writeOffLoanSchema } from '@/modules/loans/validators';

describe('Loan action validators', () => {
  it('requires a write-off reason between 10 and 500 characters', () => {
    expect(
      writeOffLoanSchema.validate({ reason: 'too short' }).error?.message
    ).toContain('"reason" length must be at least 10 characters long');

    const { error, value } = writeOffLoanSchema.validate({
      reason: 'Board-approved write-off after collections review',
    });

    expect(error).toBeUndefined();
    expect(value).toEqual({
      reason: 'Board-approved write-off after collections review',
    });
  });

  it('requires early maturity dates in YYYY-MM-DD format', () => {
    expect(
      earlyMaturityLoanSchema.validate({ maturityDate: '15/03/2027' }).error?.message
    ).toContain('"maturityDate" with value "15/03/2027" fails to match the required pattern');

    const { error, value } = earlyMaturityLoanSchema.validate({
      maturityDate: '2027-03-15',
    });

    expect(error).toBeUndefined();
    expect(value).toEqual({
      maturityDate: '2027-03-15',
    });
  });
});
