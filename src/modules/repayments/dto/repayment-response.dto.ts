export interface RepaymentResponseDto {
  id: number;
  loanId: number;
  amount: number;
  transactionDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
