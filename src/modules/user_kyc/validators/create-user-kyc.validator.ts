import Joi from 'joi';

import { kycDocumentTypeValues } from '@/common/types/kyc';

export const createUserKycSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  documentType: Joi.string()
    .valid(...kycDocumentTypeValues)
    .required(),
});
