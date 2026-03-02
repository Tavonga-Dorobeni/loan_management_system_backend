import Joi from 'joi';
import { roleValues } from '@/common/types/roles';

export const createUserSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().email().required(),
  role: Joi.string()
    .valid(...roleValues)
    .optional(),
  password: Joi.string().min(8).optional(),
});
