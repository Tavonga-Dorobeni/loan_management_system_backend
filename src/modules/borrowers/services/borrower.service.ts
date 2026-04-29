import type {
  BorrowerResponseDto,
  CreateBorrowerDto,
  UpdateBorrowerDto,
} from '@/modules/borrowers/dto';

import { Op } from 'sequelize';

import { type ListEnvelope, buildListEnvelope, getOffset } from '@/common/utils/list';
import { kycDocumentTypeValues } from '@/common/types/kyc';
import { BorrowerModel } from '@/modules/borrowers/model';
import { BorrowerKycModel } from '@/modules/borrower_kyc/model';
import { ConflictError, ForbiddenError, NotFoundError } from '@/common/utils/errors';
import { LoanModel } from '@/modules/loans/model';

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

export interface BorrowerListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
}

export class BorrowerService {
  async list(query: BorrowerListQuery): Promise<ListEnvelope<BorrowerResponseDto>> {
    const where: Record<PropertyKey, unknown> = {};

    if (query.search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${query.search}%` } },
        { lastName: { [Op.like]: `%${query.search}%` } },
        { idNumber: { [Op.like]: `%${query.search}%` } },
        { ecNumber: { [Op.like]: `%${query.search}%` } },
        { phoneNumber: { [Op.like]: `%${query.search}%` } },
      ];
    }

    const { rows, count } = await BorrowerModel.findAndCountAll({
      where,
      order: [[query.sortBy ?? 'createdAt', query.sortOrder.toUpperCase()]],
      limit: query.pageSize,
      offset: getOffset(query.page, query.pageSize),
    });

    return buildListEnvelope(
      rows.map(toBorrowerResponse),
      query.page,
      query.pageSize,
      count
    );
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
    payload: UpdateBorrowerDto,
    actorRole?: string
  ): Promise<BorrowerResponseDto> {
    const borrower = await BorrowerModel.findByPk(borrowerId);
    if (!borrower) {
      throw new NotFoundError('Borrower not found');
    }

    if (actorRole === 'customer_support') {
      const disallowedFields = ['firstName', 'lastName', 'ecNumber', 'idNumber'].filter(
        (field) => payload[field as keyof UpdateBorrowerDto] !== undefined
      );

      if (disallowedFields.length > 0) {
        throw new ForbiddenError(
          'Customer support can only update borrower contact fields'
        );
      }
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

  async getProfile(borrowerId: number): Promise<{
    borrower: BorrowerResponseDto;
    kyc: Array<{ documentType: string; present: boolean }>;
    loanSummary: { count: number; activeCount: number; outstandingDue: number };
  }> {
    const borrower = await BorrowerModel.findByPk(borrowerId);
    if (!borrower) {
      throw new NotFoundError('Borrower not found');
    }

    const [documents, loans] = await Promise.all([
      BorrowerKycModel.findAll({
        where: { borrowerId },
      }),
      LoanModel.findAll({
        where: { borrowerId },
      }),
    ]);

    const presentTypes = new Set(documents.map((document) => document.documentType));
    const outstandingDue = Number(
      loans
        .reduce((sum, loan) => sum + Number(loan.amountDue ?? 0), 0)
        .toFixed(2)
    );

    return {
      borrower: toBorrowerResponse(borrower),
      kyc: kycDocumentTypeValues.map((documentType) => ({
        documentType,
        present: presentTypes.has(documentType),
      })),
      loanSummary: {
        count: loans.length,
        activeCount: loans.filter((loan) => {
          const status = loan.status.toUpperCase();
          return status === 'SUCCESS' || status === 'ACTIVE' || Number(loan.amountDue ?? 0) > 0;
        }).length,
        outstandingDue,
      },
    };
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
