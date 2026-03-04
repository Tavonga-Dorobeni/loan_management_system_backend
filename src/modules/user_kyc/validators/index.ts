import Joi from 'joi';

export * from '@/modules/user_kyc/validators/create-user-kyc.validator';

export const userIdParamSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
});
