import type {
  CreateUserKycDto,
  UserKycResponseDto,
} from '@/modules/user_kyc/dto';

import { s3Service } from '@/common/storage/s3.service';
import { NotFoundError, ValidationError } from '@/common/utils/errors';
import { UserModel } from '@/modules/users/model';
import { UserKycModel } from '@/modules/user_kyc/model';

const mapUserKycResponse = async (
  kycDocument: UserKycModel
): Promise<UserKycResponseDto> => ({
  id: kycDocument.id,
  userId: kycDocument.userId,
  documentType: kycDocument.documentType,
  documentUrl: await s3Service.getSignedReadUrl(kycDocument.storageKey),
  createdAt: kycDocument.createdAt.toISOString(),
  updatedAt: kycDocument.updatedAt.toISOString(),
});

export class UserKycService {
  async create(payload: CreateUserKycDto, file?: Express.Multer.File): Promise<UserKycResponseDto> {
    if (!file) {
      throw new ValidationError('KYC file is required');
    }

    const user = await UserModel.findByPk(payload.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const upload = await s3Service.uploadKycDocument({
      borrowerId: payload.userId,
      fileName: file.originalname,
      contentType: file.mimetype,
      body: file.buffer,
    });

    const kycDocument = await UserKycModel.create({
      userId: payload.userId,
      documentType: payload.documentType,
      documentUrl: upload.objectUrl,
      storageKey: upload.key,
    });

    return mapUserKycResponse(kycDocument);
  }

  async listByUser(userId: number): Promise<UserKycResponseDto[]> {
    const documents = await UserKycModel.findAll({
      where: {
        userId,
      },
      order: [['createdAt', 'DESC']],
    });

    return Promise.all(documents.map(mapUserKycResponse));
  }
}

export const userKycService = new UserKycService();
