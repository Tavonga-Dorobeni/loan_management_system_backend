import { LoanModel } from '@/modules/loans/model';
import { sequelize } from '@/common/config/database.config';
import { repaymentScheduleService } from '@/modules/repayments/services/schedule.service';

describe('RepaymentScheduleService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds a 12-month portfolio schedule with available years and the next pending month', async () => {
    jest
      .spyOn(sequelize, 'query')
      .mockResolvedValueOnce([
        { month: 1, expected: '50000.00', activeLoanCount: '12' },
        { month: 2, expected: '52000.00', activeLoanCount: '13' },
        { month: 3, expected: '52000.00', activeLoanCount: '13' },
        { month: 4, expected: '52000.00', activeLoanCount: '13' },
        { month: 5, expected: '52000.00', activeLoanCount: '13' },
        { month: 6, expected: '52000.00', activeLoanCount: '13' },
        { month: 7, expected: '0.00', activeLoanCount: '0' },
        { month: 8, expected: '0.00', activeLoanCount: '0' },
        { month: 9, expected: '0.00', activeLoanCount: '0' },
        { month: 10, expected: '0.00', activeLoanCount: '0' },
        { month: 11, expected: '0.00', activeLoanCount: '0' },
        { month: 12, expected: '0.00', activeLoanCount: '0' },
      ] as never)
      .mockResolvedValueOnce([
        { month: 1, received: '50000.00', repaymentCount: '12' },
        { month: 2, received: '50000.00', repaymentCount: '11' },
        { month: 4, received: '52000.00', repaymentCount: '13' },
      ] as never)
      .mockResolvedValueOnce([{ minYear: 2025, maxYear: 2027 }] as never);

    const schedule = await repaymentScheduleService.getAnnualSchedule(2026);

    expect(schedule.year).toBe(2026);
    expect(schedule.availableYears).toEqual([2025, 2026, 2027]);
    expect(schedule.nextPendingMonth).toBe(2);
    expect(schedule.months).toHaveLength(12);
    expect(schedule.months[0]).toEqual({
      month: 1,
      label: 'January',
      expected: 50000,
      received: 50000,
      outstanding: 0,
      activeLoanCount: 12,
      repaymentCount: 12,
      status: 'FULL',
    });
    expect(schedule.months[1]).toEqual({
      month: 2,
      label: 'February',
      expected: 52000,
      received: 50000,
      outstanding: 2000,
      activeLoanCount: 13,
      repaymentCount: 11,
      status: 'PARTIAL',
    });
    expect(schedule.months[2]).toEqual({
      month: 3,
      label: 'March',
      expected: 52000,
      received: 0,
      outstanding: 52000,
      activeLoanCount: 13,
      repaymentCount: 0,
      status: 'UNPAID',
    });
    expect(schedule.months[10]).toEqual({
      month: 11,
      label: 'November',
      expected: 0,
      received: 0,
      outstanding: 0,
      activeLoanCount: 0,
      repaymentCount: 0,
      status: 'INACTIVE',
    });
  });

  it('returns a null nextPendingMonth when every active month is fully covered', async () => {
    jest
      .spyOn(sequelize, 'query')
      .mockResolvedValueOnce(
        Array.from({ length: 12 }, (_, index) => ({
          month: index + 1,
          expected: index < 2 ? '1000.00' : '0.00',
          activeLoanCount: index < 2 ? '1' : '0',
        })) as never
      )
      .mockResolvedValueOnce([
        { month: 1, received: '1000.00', repaymentCount: '1' },
        { month: 2, received: '1000.00', repaymentCount: '1' },
      ] as never)
      .mockResolvedValueOnce([{ minYear: 2026, maxYear: 2026 }] as never);

    const schedule = await repaymentScheduleService.getAnnualSchedule(2026);

    expect(schedule.nextPendingMonth).toBeNull();
  });

  it('enumerates the per-loan schedule slots with coverage statuses', async () => {
    jest.spyOn(LoanModel, 'findByPk').mockResolvedValue({
      id: 99,
      startDate: new Date('2026-04-15T00:00:00.000Z'),
      endDate: new Date('2026-06-20T00:00:00.000Z'),
      repaymentAmount: 4000,
    } as never);
    jest.spyOn(sequelize, 'query').mockResolvedValueOnce([
      { year: 2026, month: 4, cumulativeReceived: '1500.00' },
      { year: 2026, month: 5, cumulativeReceived: '4000.00' },
    ] as never);

    const slots = await repaymentScheduleService.getLoanSchedule(99);

    expect(slots).toEqual([
      {
        year: 2026,
        month: 4,
        status: 'PARTIAL',
        cumulativeReceived: 1500,
        expected: 4000,
      },
      {
        year: 2026,
        month: 5,
        status: 'COVERED',
        cumulativeReceived: 4000,
        expected: 4000,
      },
      {
        year: 2026,
        month: 6,
        status: 'UNCOVERED',
        cumulativeReceived: 0,
        expected: 4000,
      },
    ]);
  });
});
