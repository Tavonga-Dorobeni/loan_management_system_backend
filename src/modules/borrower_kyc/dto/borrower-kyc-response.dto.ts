import type { KycDocumentTypes } from '@/common/types/kyc';

export interface BorrowerKycResponseDto {
  id: string;
  borrowerId: number;
  documentType: KycDocumentTypes;
  documentUrl: string;
  signedUrl: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowerKycListResponseDto {
  items: BorrowerKycResponseDto[];
}

export interface BorrowerKycUploadResponseDto {
  id: string;
  uploadUrl: string;
}
