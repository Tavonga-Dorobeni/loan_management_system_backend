export interface PeriodSlot {
  year: number;
  month: number;
}

export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const isValidPeriodMonth = (month: number): boolean =>
  Number.isInteger(month) && month >= 1 && month <= 12;

export const toPeriodSlotFromDate = (value: Date): PeriodSlot => ({
  year: value.getFullYear(),
  month: value.getMonth() + 1,
});

export const getPeriodIndex = (year: number, month: number): number =>
  year * 12 + (month - 1);

export const isPeriodWithinRange = (
  periodYear: number,
  periodMonth: number,
  startDate: Date,
  endDate: Date
): boolean => {
  const start = toPeriodSlotFromDate(startDate);
  const end = toPeriodSlotFromDate(endDate);
  const periodIndex = getPeriodIndex(periodYear, periodMonth);

  return (
    periodIndex >= getPeriodIndex(start.year, start.month) &&
    periodIndex <= getPeriodIndex(end.year, end.month)
  );
};

export const enumeratePeriods = (
  startDate: Date,
  endDate: Date
): PeriodSlot[] => {
  const periods: PeriodSlot[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const finalMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= finalMonth) {
    periods.push({
      year: cursor.getFullYear(),
      month: cursor.getMonth() + 1,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return periods;
};

export const getMonthLabel = (month: number): string => MONTH_LABELS[month - 1] ?? '';
