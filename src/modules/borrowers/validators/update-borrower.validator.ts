import Joi from 'joi';

export const updateBorrowerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).optional(),
  lastName: Joi.string().trim().min(1).max(100).optional(),
  ecNumber: Joi.string().trim().min(1).max(100).optional(),
  idNumber: Joi.string().trim().min(3).max(100).optional(),
  phoneNumber: Joi.string().trim().max(50).allow(null, '').optional(),
  email: Joi.string().email().allow(null, '').optional(),
}).min(1);
