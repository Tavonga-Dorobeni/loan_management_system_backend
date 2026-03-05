import { Router } from 'express';
import multer from 'multer';

import { authMiddleware } from '@/common/middleware/auth.middleware';
import { asyncHandler, validate } from '@/common/utils/validation';
import { borrowerKycController } from '@/modules/borrower_kyc/controller';
import {
  borrowerIdParamSchema,
  createBorrowerKycSchema,
} from '@/modules/borrower_kyc/validators';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/**
 * @openapi
 * /api/v1/borrower-kyc/upload:
 *   post:
 *     tags: [Borrower KYC]
 *     summary: Upload a KYC document and create a borrower_kyc record.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [borrowerId, documentType, file]
 *             properties:
 *               borrowerId:
 *                 type: integer
 *               documentType:
 *                 type: string
 *                 enum: [payslip, national_id, passport_sized_photo, application_form]
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: KYC document uploaded and stored
 * /api/v1/borrower-kyc/borrower/{borrower_id}:
 *   get:
 *     tags: [Borrower KYC]
 *     summary: List KYC documents for a borrower with signed read URLs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: borrower_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Borrower KYC documents
 */
router.post(
  '/upload',
  authMiddleware,
  upload.single('file'),
  validate({ body: createBorrowerKycSchema }),
  asyncHandler(borrowerKycController.create.bind(borrowerKycController))
);

router.get(
  '/borrower/:borrower_id',
  authMiddleware,
  validate({ params: borrowerIdParamSchema }),
  asyncHandler(borrowerKycController.listByBorrower.bind(borrowerKycController))
);

export default router;
