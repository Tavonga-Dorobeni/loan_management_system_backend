export interface UpdateLoanDto {
  borrowerId?: number;
  referenceNumber?: string;
  ecNumber?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  disbursementDate?: string | null;
  repaymentAmount?: number;
  totalAmount?: number;
  amountPaid?: number | null;
  amountDue?: number | null;
  message?: string | null;
}
