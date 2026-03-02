import Joi from 'joi';

export * from '@/modules/users/validators/create-user.validator';
export * from '@/modules/users/validators/update-user.validator';

export const userIdParamSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
});
