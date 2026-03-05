import { Router } from 'express';

import { authMiddleware } from '@/common/middleware/auth.middleware';
import { asyncHandler, validate } from '@/common/utils/validation';
import { repaymentController } from '@/modules/repayments/controller';
import {
  createRepaymentSchema,
  repaymentIdParamSchema,
  updateRepaymentSchema,
} from '@/modules/repayments/validators';

const router = Router();

/**
 * @openapi
 * /api/v1/repayments:
 *   get:
 *     tags: [Repayments]
 *     summary: List repayments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Repayments retrieved successfully
 *   post:
 *     tags: [Repayments]
 *     summary: Create a repayment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [loanId, amount, transactionDate, status]
 *             properties:
 *               loanId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               transactionDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Repayment created successfully
 * /api/v1/repayments/{repayment_id}:
 *   get:
 *     tags: [Repayments]
 *     summary: Get repayment by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: repayment_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Repayment retrieved successfully
 *   put:
 *     tags: [Repayments]
 *     summary: Update repayment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: repayment_id
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
 *               loanId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               transactionDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Repayment updated successfully
 *   delete:
 *     tags: [Repayments]
 *     summary: Delete repayment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: repayment_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Repayment deleted successfully
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(repaymentController.list.bind(repaymentController))
);
router.post(
  '/',
  authMiddleware,
  validate({ body: createRepaymentSchema }),
  asyncHandler(repaymentController.create.bind(repaymentController))
);
router.get(
  '/:repayment_id',
  authMiddleware,
  validate({ params: repaymentIdParamSchema }),
  asyncHandler(repaymentController.getById.bind(repaymentController))
);
router.put(
  '/:repayment_id',
  authMiddleware,
  validate({ params: repaymentIdParamSchema, body: updateRepaymentSchema }),
  asyncHandler(repaymentController.update.bind(repaymentController))
);
router.delete(
  '/:repayment_id',
  authMiddleware,
  validate({ params: repaymentIdParamSchema }),
  asyncHandler(repaymentController.delete.bind(repaymentController))
);

export default router;
