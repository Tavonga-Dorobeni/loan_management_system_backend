import Joi from 'joi';

import { roleValues } from '@/common/types/roles';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().trim().max(100).required(),
  lastName: Joi.string().trim().max(100).required(),
  role: Joi.string()
    .valid(...roleValues)
    .optional(),
});
