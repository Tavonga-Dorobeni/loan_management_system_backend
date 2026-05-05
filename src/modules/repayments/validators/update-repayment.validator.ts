import Joi from 'joi';

export const updateRepaymentSchema = Joi.object({
  loanId: Joi.number().integer().positive(),
  amount: Joi.number().precision(2).positive(),
  transactionDate: Joi.date().iso(),
  periodYear: Joi.number().integer().min(2000).max(2100).required(),
  periodMonth: Joi.number().integer().min(1).max(12).required(),
});
