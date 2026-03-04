import type { KycDocumentTypes } from '@/common/types/kyc';

export interface CreateUserKycDto {
  userId: number;
  documentType: KycDocumentTypes;
}
