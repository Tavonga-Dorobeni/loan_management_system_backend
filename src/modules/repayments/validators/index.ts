import Joi from 'joi';

import { createListQuerySchema } from '@/common/utils/list';

export * from '@/modules/repayments/validators/create-repayment.validator';
export * from '@/modules/repayments/validators/update-repayment.validator';

export const repaymentIdParamSchema = Joi.object({
  repayment_id: Joi.number().integer().positive().required(),
});

export const repaymentsQuerySchema = createListQuerySchema(
  ['transactionDate', 'amount', 'periodYear', 'periodMonth', 'createdAt'],
  {
    loanId: Joi.number().integer().positive().optional(),
    status: Joi.string().trim().max(100).optional(),
    transactionDateFrom: Joi.date().iso().optional(),
    transactionDateTo: Joi.date().iso().optional(),
    periodYear: Joi.number().integer().min(2000).max(2100).optional(),
    periodMonth: Joi.number().integer().min(1).max(12).optional(),
  }
);

export const repaymentScheduleQuerySchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100).required(),
});
