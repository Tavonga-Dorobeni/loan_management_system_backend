import Joi from 'joi';

import { createListQuerySchema } from '@/common/utils/list';
import { roleValues } from '@/common/types/roles';

export const activityLogsQuerySchema = createListQuerySchema(['createdAt'], {
  actorUserId: Joi.number().integer().positive().optional(),
  actorRole: Joi.string()
    .valid(...roleValues)
    .optional(),
  entityType: Joi.string().trim().max(100).optional(),
  entityId: Joi.string().trim().max(100).optional(),
  sourceType: Joi.string().trim().max(50).optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
});
