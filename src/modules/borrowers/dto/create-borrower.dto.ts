export interface CreateBorrowerDto {
  firstName: string;
  lastName: string;
  idNumber: string;
  phoneNumber?: string | null;
  email?: string | null;
}
