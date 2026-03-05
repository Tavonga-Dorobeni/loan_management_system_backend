import Joi from 'joi';

export * from '@/modules/repayments/validators/create-repayment.validator';
export * from '@/modules/repayments/validators/update-repayment.validator';

export const repaymentIdParamSchema = Joi.object({
  repayment_id: Joi.number().integer().positive().required(),
});
