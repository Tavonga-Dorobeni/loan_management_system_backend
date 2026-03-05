import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { loanService } from '@/modules/loans/services/loan.service';

export class LoanController {
  async list(_req: Request, res: Response): Promise<Response> {
    const loans = await loanService.list();
    return sendSuccess(res, loans, 'Loans retrieved successfully');
  }

  async getById(req: Request, res: Response): Promise<Response> {
    const loan = await loanService.getById(Number(req.params.loan_id));
    return sendSuccess(res, loan, 'Loan retrieved successfully');
  }

  async create(req: Request, res: Response): Promise<Response> {
    const loan = await loanService.create(req.body);
    return sendSuccess(res, loan, 'Loan created successfully', 201);
  }

  async update(req: Request, res: Response): Promise<Response> {
    const loan = await loanService.update(Number(req.params.loan_id), req.body);
    return sendSuccess(res, loan, 'Loan updated successfully');
  }

  async delete(req: Request, res: Response): Promise<Response> {
    const result = await loanService.delete(Number(req.params.loan_id));
    return sendSuccess(res, result, 'Loan deleted successfully');
  }
}

export const loanController = new LoanController();
