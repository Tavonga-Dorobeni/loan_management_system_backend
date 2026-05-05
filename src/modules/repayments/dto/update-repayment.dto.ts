export interface UpdateRepaymentDto {
  loanId?: number;
  amount?: number;
  transactionDate?: string;
  periodYear?: number;
  periodMonth?: number;
}
