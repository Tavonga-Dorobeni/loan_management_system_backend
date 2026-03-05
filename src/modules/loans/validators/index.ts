import Joi from 'joi';

export * from '@/modules/loans/validators/create-loan.validator';
export * from '@/modules/loans/validators/update-loan.validator';

export const loanIdParamSchema = Joi.object({
  loan_id: Joi.number().integer().positive().required(),
});
