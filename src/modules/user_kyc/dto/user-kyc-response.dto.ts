import type { KycDocumentTypes } from '@/common/types/kyc';

export interface UserKycResponseDto {
  id: string;
  userId: number;
  documentType: KycDocumentTypes;
  documentUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserKycUploadResponseDto {
  id: string;
  uploadUrl: string;
}
