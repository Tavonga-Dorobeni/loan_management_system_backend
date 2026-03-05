import type { KycDocumentTypes } from '@/common/types/kyc';

export interface BorrowerKycResponseDto {
  id: string;
  borrowerId: number;
  documentType: KycDocumentTypes;
  documentUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowerKycUploadResponseDto {
  id: string;
  uploadUrl: string;
}
