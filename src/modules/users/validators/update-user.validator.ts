import Joi from 'joi';
import { roleValues } from '@/common/types/roles';

export const updateUserSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).optional(),
  lastName: Joi.string().trim().min(1).max(100).optional(),
  role: Joi.string()
    .valid(...roleValues)
    .optional(),
  status: Joi.string().trim().max(50).optional(),
}).min(1);
