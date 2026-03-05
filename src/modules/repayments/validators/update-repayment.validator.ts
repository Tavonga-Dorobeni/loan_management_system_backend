import Joi from 'joi';

export const updateRepaymentSchema = Joi.object({
  loanId: Joi.number().integer().positive(),
  amount: Joi.number().precision(2).positive(),
  transactionDate: Joi.date().iso(),
  status: Joi.string().trim().max(100),
}).min(1);
