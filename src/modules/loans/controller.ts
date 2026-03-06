import type { Request, Response } from 'express';

import { ValidationError } from '@/common/utils/errors';
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

  async importExcel(req: Request, res: Response): Promise<Response> {
    if (!req.file) {
      throw new ValidationError('Excel file is required');
    }

    const result = await loanService.importFromExcel(req.file);
    return sendSuccess(res, result, 'Loan excel import completed');
  }

  async importApprovalsExcel(req: Request, res: Response): Promise<Response> {
    if (!req.file) {
      throw new ValidationError('Excel file is required');
    }

    const result = await loanService.importApprovalsFromExcel(req.file);
    return sendSuccess(res, result, 'Loan approval excel import completed');
  }

  async importRepaymentsExcel(req: Request, res: Response): Promise<Response> {
    if (!req.file) {
      throw new ValidationError('Excel file is required');
    }

    const result = await loanService.importRepaymentsFromExcel(req.file);
    return sendSuccess(res, result, 'Loan repayment excel import completed');
  }
}

export const loanController = new LoanController();
