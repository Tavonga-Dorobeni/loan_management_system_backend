import Joi from 'joi';

export const createRepaymentSchema = Joi.object({
  loanId: Joi.number().integer().positive().required(),
  amount: Joi.number().precision(2).positive().required(),
  transactionDate: Joi.date().iso().required(),
  periodYear: Joi.number().integer().min(2000).max(2100).required(),
  periodMonth: Joi.number().integer().min(1).max(12).required(),
});
