import Joi from 'joi';

export const updateLoanSchema = Joi.object({
  borrowerId: Joi.number().integer().positive(),
  referenceNumber: Joi.string().trim().max(100),
  type: Joi.string().trim().max(100),
  status: Joi.string().trim().max(100),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  disbursementDate: Joi.date().iso().allow(null),
  repaymentAmount: Joi.number().precision(2).positive(),
  totalAmount: Joi.number().precision(2).positive(),
  amountPaid: Joi.number().precision(2).min(0).allow(null),
  amountDue: Joi.number().precision(2).min(0).allow(null),
  message: Joi.string().trim().max(2000).allow(null, ''),
}).min(1);
