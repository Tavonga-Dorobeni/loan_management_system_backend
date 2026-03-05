import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { borrowerKycService } from '@/modules/borrower_kyc/services/borrower-kyc.service';

export class BorrowerKycController {
  async create(req: Request, res: Response): Promise<Response> {
    const document = await borrowerKycService.create(req.body, req.file);
    return sendSuccess(res, document, 'Borrower KYC document uploaded successfully', 201);
  }

  async listByBorrower(req: Request, res: Response): Promise<Response> {
    const documents = await borrowerKycService.listByBorrower(
      Number(req.params.borrower_id)
    );
    return sendSuccess(
      res,
      documents,
      'Borrower KYC documents retrieved successfully'
    );
  }
}

export const borrowerKycController = new BorrowerKycController();
