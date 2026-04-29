import type {
  BorrowerKycResponseDto,
  CreateBorrowerKycDto,
} from '@/modules/borrower_kyc/dto';

import { s3Service } from '@/common/storage/s3.service';
import { NotFoundError, ValidationError } from '@/common/utils/errors';
import { BorrowerModel } from '@/modules/borrowers/model';
import { BorrowerKycModel } from '@/modules/borrower_kyc/model';

const mapBorrowerKycResponse = async (
  kycDocument: BorrowerKycModel
): Promise<BorrowerKycResponseDto> => {
  const signedRead = await s3Service.getSignedReadUrlDetails(kycDocument.storageKey);

  return {
    id: kycDocument.id,
    borrowerId: kycDocument.borrowerId,
    documentType: kycDocument.documentType,
    documentUrl: signedRead.signedUrl,
    signedUrl: signedRead.signedUrl,
    expiresAt: signedRead.expiresAt,
    createdAt: kycDocument.createdAt.toISOString(),
    updatedAt: kycDocument.updatedAt.toISOString(),
  };
};

export class BorrowerKycService {
  async create(
    payload: CreateBorrowerKycDto,
    file?: Express.Multer.File
  ): Promise<BorrowerKycResponseDto> {
    if (!file) {
      throw new ValidationError('KYC file is required');
    }

    const borrower = await BorrowerModel.findByPk(payload.borrowerId);
    if (!borrower) {
      throw new NotFoundError('Borrower not found');
    }

    const upload = await s3Service.uploadKycDocument({
      borrowerId: payload.borrowerId,
      documentType: payload.documentType,
      fileName: file.originalname,
      contentType: file.mimetype,
      body: file.buffer,
    });

    const kycDocument = await BorrowerKycModel.create({
      borrowerId: payload.borrowerId,
      documentType: payload.documentType,
      documentUrl: upload.objectUrl,
      storageKey: upload.key,
    });

    return mapBorrowerKycResponse(kycDocument);
  }

  async listByBorrower(
    borrowerId: number,
    documentType?: string
  ): Promise<BorrowerKycResponseDto[]> {
    const documents = await BorrowerKycModel.findAll({
      where: {
        borrowerId,
        ...(documentType ? { documentType } : {}),
      },
      order: [['createdAt', 'DESC']],
    });

    return Promise.all(documents.map(mapBorrowerKycResponse));
  }
}

export const borrowerKycService = new BorrowerKycService();
