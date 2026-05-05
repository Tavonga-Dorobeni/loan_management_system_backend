export interface CreateRepaymentDto {
  loanId: number;
  amount: number;
  transactionDate: string;
  periodYear: number;
  periodMonth: number;
}
