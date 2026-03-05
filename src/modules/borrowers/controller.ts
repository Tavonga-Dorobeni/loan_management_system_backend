import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { borrowerService } from '@/modules/borrowers/services/borrower.service';

export class BorrowerController {
  async list(_req: Request, res: Response): Promise<Response> {
    const borrowers = await borrowerService.list();
    return sendSuccess(res, borrowers, 'Borrowers retrieved successfully');
  }

  async getById(req: Request, res: Response): Promise<Response> {
    const borrower = await borrowerService.getById(Number(req.params.borrower_id));
    return sendSuccess(res, borrower, 'Borrower retrieved successfully');
  }

  async create(req: Request, res: Response): Promise<Response> {
    const borrower = await borrowerService.create(req.body);
    return sendSuccess(res, borrower, 'Borrower created successfully', 201);
  }

  async update(req: Request, res: Response): Promise<Response> {
    const borrower = await borrowerService.update(
      Number(req.params.borrower_id),
      req.body
    );
    return sendSuccess(res, borrower, 'Borrower updated successfully');
  }

  async delete(req: Request, res: Response): Promise<Response> {
    const result = await borrowerService.delete(Number(req.params.borrower_id));
    return sendSuccess(res, result, 'Borrower deleted successfully');
  }
}

export const borrowerController = new BorrowerController();
