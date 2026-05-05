export interface RepaymentResponseDto {
  id: number;
  loanId: number;
  loanReference: string;
  amount: number;
  transactionDate: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}
