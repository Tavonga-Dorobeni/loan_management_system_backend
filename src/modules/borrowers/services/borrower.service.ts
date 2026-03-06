import type {
  BorrowerResponseDto,
  CreateBorrowerDto,
  UpdateBorrowerDto,
} from '@/modules/borrowers/dto';

import { BorrowerModel } from '@/modules/borrowers/model';
import { ConflictError, NotFoundError } from '@/common/utils/errors';

const toBorrowerResponse = (borrower: BorrowerModel): BorrowerResponseDto => ({
  id: borrower.id,
  firstName: borrower.firstName,
  lastName: borrower.lastName,
  ecNumber: borrower.ecNumber,
  idNumber: borrower.idNumber,
  phoneNumber: borrower.phoneNumber,
  email: borrower.email,
  createdAt: borrower.createdAt.toISOString(),
  updatedAt: borrower.updatedAt.toISOString(),
});

export class BorrowerService {
  async list(): Promise<BorrowerResponseDto[]> {
    const borrowers = await BorrowerModel.findAll({
      order: [['createdAt', 'DESC']],
    });

    return borrowers.map(toBorrowerResponse);
  }

  async getById(borrowerId: number): Promise<BorrowerResponseDto> {
    const borrower = await BorrowerModel.findByPk(borrowerId);
    if (!borrower) {
      throw new NotFoundError('Borrower not found');
    }

    return toBorrowerResponse(borrower);
  }

  async create(payload: CreateBorrowerDto): Promise<BorrowerResponseDto> {
    const existingIdNumber = await BorrowerModel.findOne({
      where: {
        idNumber: payload.idNumber,
      },
    });

    if (existingIdNumber) {
      throw new ConflictError('A borrower with this ID number already exists');
    }

    const existingEcNumber = await BorrowerModel.findOne({
      where: {
        ecNumber: payload.ecNumber,
      },
    });

    if (existingEcNumber) {
      throw new ConflictError('A borrower with this EC number already exists');
    }

    const borrower = await BorrowerModel.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      ecNumber: payload.ecNumber,
      idNumber: payload.idNumber,
      phoneNumber: payload.phoneNumber ?? null,
      email: payload.email ?? null,
    });

    return toBorrowerResponse(borrower);
  }

  async update(
    borrowerId: number,
    payload: UpdateBorrowerDto
  ): Promise<BorrowerResponseDto> {
    const borrower = await BorrowerModel.findByPk(borrowerId);
    if (!borrower) {
      throw new NotFoundError('Borrower not found');
    }

    if (payload.idNumber && payload.idNumber !== borrower.idNumber) {
      const existing = await BorrowerModel.findOne({
        where: {
          idNumber: payload.idNumber,
        },
      });

      if (existing) {
        throw new ConflictError('A borrower with this ID number already exists');
      }
    }

    if (payload.ecNumber && payload.ecNumber !== borrower.ecNumber) {
      const existing = await BorrowerModel.findOne({
        where: {
          ecNumber: payload.ecNumber,
        },
      });

      if (existing) {
        throw new ConflictError('A borrower with this EC number already exists');
      }
    }

    await borrower.update({
      firstName: payload.firstName ?? borrower.firstName,
      lastName: payload.lastName ?? borrower.lastName,
      ecNumber: payload.ecNumber ?? borrower.ecNumber,
      idNumber: payload.idNumber ?? borrower.idNumber,
      phoneNumber: payload.phoneNumber ?? borrower.phoneNumber,
      email: payload.email ?? borrower.email,
    });

    return toBorrowerResponse(borrower);
  }

  async delete(borrowerId: number): Promise<{ id: number; deleted: boolean }> {
    const borrower = await BorrowerModel.findByPk(borrowerId);
    if (!borrower) {
      throw new NotFoundError('Borrower not found');
    }

    await borrower.destroy();

    return {
      id: borrowerId,
      deleted: true,
    };
  }
}

export const borrowerService = new BorrowerService();
