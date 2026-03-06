export interface LoanResponseDto {
  id: number;
  borrowerId: number;
  referenceNumber: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  disbursementDate: string | null;
  repaymentAmount: number;
  totalAmount: number;
  amountPaid: number | null;
  amountDue: number | null;
  message: string | null;
  createdAt: string;
  updatedAt: string;
}
