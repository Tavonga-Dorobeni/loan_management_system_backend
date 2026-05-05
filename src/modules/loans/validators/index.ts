import Joi from 'joi';

import { createListQuerySchema } from '@/common/utils/list';

export * from '@/modules/loans/validators/create-loan.validator';
export * from '@/modules/loans/validators/update-loan.validator';

export const loanIdParamSchema = Joi.object({
  loan_id: Joi.number().integer().positive().required(),
});

export const loansQuerySchema = createListQuerySchema(
  [
    'referenceNumber',
    'type',
    'status',
    'startDate',
    'endDate',
    'amountPaid',
    'amountDue',
    'createdAt',
  ],
  {
    borrowerId: Joi.number().integer().positive().optional(),
    status: Joi.string().trim().max(100).optional(),
    type: Joi.string().trim().max(100).optional(),
    startDateFrom: Joi.date().iso().optional(),
    startDateTo: Joi.date().iso().optional(),
    endDateFrom: Joi.date().iso().optional(),
    endDateTo: Joi.date().iso().optional(),
  }
);

export const repaymentImportQuerySchema = Joi.object({
  periodYear: Joi.number().integer().min(2000).max(2100).required(),
  periodMonth: Joi.number().integer().min(1).max(12).required(),
});
