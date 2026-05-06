import Joi from 'joi';

export const reportQuerySchema = Joi.object({
  format: Joi.string().valid('json', 'csv', 'xlsx').default('json'),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  month: Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  borrowerId: Joi.number().integer().positive().optional(),
  loanId: Joi.number().integer().positive().optional(),
  status: Joi.string().trim().max(100).optional(),
  type: Joi.string().trim().max(100).optional(),
});
