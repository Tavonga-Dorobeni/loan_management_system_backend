export interface CreateRepaymentDto {
  loanId: number;
  amount: number;
  transactionDate: string;
  status: string;
}
