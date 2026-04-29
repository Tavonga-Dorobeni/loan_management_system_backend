import Joi from 'joi';

export const createRepaymentSchema = Joi.object({
  loanId: Joi.number().integer().positive().required(),
  amount: Joi.number().precision(2).positive().required(),
  transactionDate: Joi.date().iso().required(),
});
