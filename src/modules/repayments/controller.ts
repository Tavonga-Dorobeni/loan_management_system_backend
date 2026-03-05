import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { repaymentService } from '@/modules/repayments/services/repayment.service';

export class RepaymentController {
  async list(_req: Request, res: Response): Promise<Response> {
    const repayments = await repaymentService.list();
    return sendSuccess(res, repayments, 'Repayments retrieved successfully');
  }

  async getById(req: Request, res: Response): Promise<Response> {
    const repayment = await repaymentService.getById(Number(req.params.repayment_id));
    return sendSuccess(res, repayment, 'Repayment retrieved successfully');
  }

  async create(req: Request, res: Response): Promise<Response> {
    const repayment = await repaymentService.create(req.body);
    return sendSuccess(res, repayment, 'Repayment created successfully', 201);
  }

  async update(req: Request, res: Response): Promise<Response> {
    const repayment = await repaymentService.update(
      Number(req.params.repayment_id),
      req.body
    );
    return sendSuccess(res, repayment, 'Repayment updated successfully');
  }

  async delete(req: Request, res: Response): Promise<Response> {
    const result = await repaymentService.delete(Number(req.params.repayment_id));
    return sendSuccess(res, result, 'Repayment deleted successfully');
  }
}

export const repaymentController = new RepaymentController();
