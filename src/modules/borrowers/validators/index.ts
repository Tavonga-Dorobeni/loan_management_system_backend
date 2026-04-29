import Joi from 'joi';

import { createListQuerySchema } from '@/common/utils/list';

export * from '@/modules/borrowers/validators/create-borrower.validator';
export * from '@/modules/borrowers/validators/update-borrower.validator';

export const borrowerIdParamSchema = Joi.object({
  borrower_id: Joi.number().integer().positive().required(),
});

export const borrowersQuerySchema = createListQuerySchema(
  ['firstName', 'lastName', 'idNumber', 'ecNumber', 'createdAt'],
  {}
);
