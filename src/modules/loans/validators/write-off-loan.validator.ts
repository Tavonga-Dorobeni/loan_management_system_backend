import Joi from 'joi';

export const writeOffLoanSchema = Joi.object({
  reason: Joi.string().trim().min(10).max(500).required(),
});
