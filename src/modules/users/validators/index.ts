import Joi from 'joi';

import { createListQuerySchema } from '@/common/utils/list';
import { roleValues } from '@/common/types/roles';

export * from '@/modules/users/validators/create-user.validator';
export * from '@/modules/users/validators/update-user.validator';
export * from '@/modules/users/validators/change-password.validator';

export const userIdParamSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
});

export const usersQuerySchema = createListQuerySchema(
  ['firstName', 'lastName', 'email', 'role', 'status', 'createdAt'],
  {
    role: Joi.string()
      .valid(...roleValues)
      .optional(),
    status: Joi.string().trim().max(50).optional(),
  }
);
