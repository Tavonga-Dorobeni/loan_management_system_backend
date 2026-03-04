import { Router } from 'express';
import multer from 'multer';

import { authMiddleware } from '@/common/middleware/auth.middleware';
import { asyncHandler, validate } from '@/common/utils/validation';
import { userKycController } from '@/modules/user_kyc/controller';
import {
  createUserKycSchema,
  userIdParamSchema,
} from '@/modules/user_kyc/validators';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/**
 * @openapi
 * /api/v1/user-kyc/upload:
 *   post:
 *     tags: [User KYC]
 *     summary: Upload a KYC document and create a user_kyc record.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [userId, documentType, file]
 *             properties:
 *               userId:
 *                 type: integer
 *               documentType:
 *                 type: string
 *                 enum: [national_id, passport, drivers_license, proof_of_residence, bank_statement, payslip, employment_letter, tax_certificate]
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: KYC document uploaded and stored
 * /api/v1/user-kyc/user/{user_id}:
 *   get:
 *     tags: [User KYC]
 *     summary: List KYC documents for a user with signed read URLs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User KYC documents
 */
router.post(
  '/upload',
  authMiddleware,
  upload.single('file'),
  validate({ body: createUserKycSchema }),
  asyncHandler(userKycController.create.bind(userKycController))
);

router.post(
  '/upload-url',
  authMiddleware,
  upload.single('file'),
  validate({ body: createUserKycSchema }),
  asyncHandler(userKycController.create.bind(userKycController))
);

router.get(
  '/user/:user_id',
  authMiddleware,
  validate({ params: userIdParamSchema }),
  asyncHandler(userKycController.listByUser.bind(userKycController))
);

export default router;
