import { Router } from 'express';

import { authMiddleware } from '@/common/middleware/auth.middleware';
import { asyncHandler, validate } from '@/common/utils/validation';
import { loanController } from '@/modules/loans/controller';
import {
  createLoanSchema,
  loanIdParamSchema,
  updateLoanSchema,
} from '@/modules/loans/validators';

const router = Router();

/**
 * @openapi
 * /api/v1/loans:
 *   get:
 *     tags: [Loans]
 *     summary: List loans
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Loans retrieved successfully
 *   post:
 *     tags: [Loans]
 *     summary: Create a loan
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - borrowerId
 *               - referenceNumber
 *               - type
 *               - status
 *               - startDate
 *               - endDate
 *               - repaymentAmount
 *               - totalAmount
 *             properties:
 *               borrowerId:
 *                 type: integer
 *               referenceNumber:
 *                 type: string
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               disbursementDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               repaymentAmount:
 *                 type: number
 *               totalAmount:
 *                 type: number
 *               amountPaid:
 *                 type: number
 *                 nullable: true
 *               amountDue:
 *                 type: number
 *                 nullable: true
 *               message:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Loan created successfully
 * /api/v1/loans/{loan_id}:
 *   get:
 *     tags: [Loans]
 *     summary: Get loan by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loan_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Loan retrieved successfully
 *   put:
 *     tags: [Loans]
 *     summary: Update loan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loan_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               borrowerId:
 *                 type: integer
 *               referenceNumber:
 *                 type: string
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               disbursementDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               repaymentAmount:
 *                 type: number
 *               totalAmount:
 *                 type: number
 *               amountPaid:
 *                 type: number
 *                 nullable: true
 *               amountDue:
 *                 type: number
 *                 nullable: true
 *               message:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Loan updated successfully
 *   delete:
 *     tags: [Loans]
 *     summary: Delete loan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loan_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Loan deleted successfully
 */
router.get('/', authMiddleware, asyncHandler(loanController.list.bind(loanController)));
router.post(
  '/',
  authMiddleware,
  validate({ body: createLoanSchema }),
  asyncHandler(loanController.create.bind(loanController))
);
router.get(
  '/:loan_id',
  authMiddleware,
  validate({ params: loanIdParamSchema }),
  asyncHandler(loanController.getById.bind(loanController))
);
router.put(
  '/:loan_id',
  authMiddleware,
  validate({ params: loanIdParamSchema, body: updateLoanSchema }),
  asyncHandler(loanController.update.bind(loanController))
);
router.delete(
  '/:loan_id',
  authMiddleware,
  validate({ params: loanIdParamSchema }),
  asyncHandler(loanController.delete.bind(loanController))
);

export default router;
