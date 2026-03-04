import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { userKycService } from '@/modules/user_kyc/services/user-kyc.service';

export class UserKycController {
  async create(req: Request, res: Response): Promise<Response> {
    const document = await userKycService.create(req.body, req.file);
    return sendSuccess(res, document, 'KYC document uploaded successfully', 201);
  }

  async listByUser(req: Request, res: Response): Promise<Response> {
    const documents = await userKycService.listByUser(Number(req.params.user_id));
    return sendSuccess(
      res,
      documents,
      'User KYC documents retrieved successfully'
    );
  }
}

export const userKycController = new UserKycController();
