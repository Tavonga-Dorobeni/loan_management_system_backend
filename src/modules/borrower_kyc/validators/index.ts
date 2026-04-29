import Joi from 'joi';

export * from '@/modules/borrower_kyc/validators/create-borrower-kyc.validator';

export const borrowerIdParamSchema = Joi.object({
  borrower_id: Joi.number().integer().positive().required(),
});

export const borrowerKycQuerySchema = Joi.object({
  documentType: Joi.string().trim().max(100).optional(),
});
