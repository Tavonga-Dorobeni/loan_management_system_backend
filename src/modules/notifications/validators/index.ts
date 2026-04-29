import Joi from 'joi';

import { createListQuerySchema } from '@/common/utils/list';

export const notificationDeliveriesQuerySchema = createListQuerySchema(
  ['createdAt'],
  {
    eventType: Joi.string().trim().max(100).optional(),
    status: Joi.string().valid('sent', 'failed', 'skipped').optional(),
    recipient: Joi.string().trim().max(255).optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
  }
);
