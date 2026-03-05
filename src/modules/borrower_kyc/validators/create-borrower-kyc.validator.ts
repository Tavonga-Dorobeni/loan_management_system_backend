import Joi from 'joi';

import { kycDocumentTypeValues } from '@/common/types/kyc';

export const createBorrowerKycSchema = Joi.object({
  borrowerId: Joi.number().integer().positive().required(),
  documentType: Joi.string()
    .valid(...kycDocumentTypeValues)
    .required(),
});
