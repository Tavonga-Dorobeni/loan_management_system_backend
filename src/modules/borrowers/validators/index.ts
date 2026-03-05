import Joi from 'joi';

export * from '@/modules/borrowers/validators/create-borrower.validator';
export * from '@/modules/borrowers/validators/update-borrower.validator';

export const borrowerIdParamSchema = Joi.object({
  borrower_id: Joi.number().integer().positive().required(),
});
