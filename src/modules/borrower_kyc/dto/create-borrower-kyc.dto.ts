import type { KycDocumentTypes } from '@/common/types/kyc';

export interface CreateBorrowerKycDto {
  borrowerId: number;
  documentType: KycDocumentTypes;
}
