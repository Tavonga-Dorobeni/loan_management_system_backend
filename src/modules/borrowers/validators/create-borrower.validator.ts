import Joi from 'joi';

export const createBorrowerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName: Joi.string().trim().min(1).max(100).required(),
  idNumber: Joi.string().trim().min(3).max(100).required(),
  phoneNumber: Joi.string().trim().max(50).allow(null, '').optional(),
  email: Joi.string().email().allow(null, '').optional(),
});
