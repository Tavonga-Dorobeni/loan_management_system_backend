export const PENDING_LOAN_STATUS = 'PENDING';
export const ACTIVE_LOAN_STATUS = 'ACTIVE';
export const MATURED_LOAN_STATUS = 'MATURED';
export const REJECTED_LOAN_STATUS = 'REJECTED';
export const WRITE_OFF_LOAN_STATUS = 'WRITE-OFF';
export const LEGACY_SUCCESS_LOAN_STATUS = 'SUCCESS';

export const normalizeLoanStatus = (status: string): string => {
  const trimmed = status.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/^write[-_\s]?off$/i.test(trimmed)) {
    return WRITE_OFF_LOAN_STATUS;
  }

  return trimmed.toUpperCase();
};
