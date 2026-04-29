import type { Request, Response } from 'express';

import { KycDocumentTypes } from '@/common/types/kyc';
import { borrowerKycController } from '@/modules/borrower_kyc/controller';
import { borrowerKycService } from '@/modules/borrower_kyc/services/borrower-kyc.service';

const createResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('BorrowerKycController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('wraps borrower KYC list responses in data.items', async () => {
    jest.spyOn(borrowerKycService, 'listByBorrower').mockResolvedValue([
      {
        id: 'k-1',
        borrowerId: 12,
        documentType: KycDocumentTypes.PAYSLIP,
        documentUrl: 'https://signed.example/k-1',
        signedUrl: 'https://signed.example/k-1',
        expiresAt: '2026-04-29T12:00:00.000Z',
        createdAt: '2026-04-29T11:00:00.000Z',
        updatedAt: '2026-04-29T11:00:00.000Z',
      },
    ]);

    const req = {
      params: {
        borrower_id: '12',
      },
      query: {},
    } as unknown as Request;
    const res = createResponse();

    await borrowerKycController.listByBorrower(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        items: [
          {
            id: 'k-1',
            borrowerId: 12,
            documentType: KycDocumentTypes.PAYSLIP,
            documentUrl: 'https://signed.example/k-1',
            signedUrl: 'https://signed.example/k-1',
            expiresAt: '2026-04-29T12:00:00.000Z',
            createdAt: '2026-04-29T11:00:00.000Z',
            updatedAt: '2026-04-29T11:00:00.000Z',
          },
        ],
      },
      message: 'Borrower KYC documents retrieved successfully',
    });
  });
});
