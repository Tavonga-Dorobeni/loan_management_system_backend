import Joi from 'joi';

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(8).required(),
  newPassword: Joi.string()
    .min(8)
    .invalid(Joi.ref('currentPassword'))
    .required()
    .messages({
      'any.invalid': 'New password must be different from current password',
    }),
});
