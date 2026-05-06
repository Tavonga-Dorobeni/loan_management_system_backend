import Joi from 'joi';

export const earlyMaturityLoanSchema = Joi.object({
  maturityDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
});
