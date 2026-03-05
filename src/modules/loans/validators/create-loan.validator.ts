import Joi from 'joi';

export const createLoanSchema = Joi.object({
  borrowerId: Joi.number().integer().positive().required(),
  referenceNumber: Joi.string().trim().max(100).required(),
  ecNumber: Joi.string().trim().max(100).required(),
  type: Joi.string().trim().max(100).required(),
  status: Joi.string().trim().max(100).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  disbursementDate: Joi.date().iso().allow(null),
  repaymentAmount: Joi.number().precision(2).positive().required(),
  totalAmount: Joi.number().precision(2).positive().required(),
  amountPaid: Joi.number().precision(2).min(0).allow(null),
  amountDue: Joi.number().precision(2).min(0).allow(null),
  message: Joi.string().trim().max(2000).allow(null, ''),
});
