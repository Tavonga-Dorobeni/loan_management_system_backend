import Joi from 'joi';

import { createListQuerySchema } from '@/common/utils/list';

export * from '@/modules/repayments/validators/create-repayment.validator';
export * from '@/modules/repayments/validators/update-repayment.validator';

export const repaymentIdParamSchema = Joi.object({
  repayment_id: Joi.number().integer().positive().required(),
});

export const repaymentsQuerySchema = createListQuerySchema(
  ['transactionDate', 'amount', 'createdAt'],
  {
    loanId: Joi.number().integer().positive().optional(),
    status: Joi.string().trim().max(100).optional(),
    transactionDateFrom: Joi.date().iso().optional(),
    transactionDateTo: Joi.date().iso().optional(),
  }
);
