import { Router } from 'express';

import {
  authMiddleware,
  requireAnyAuthenticatedRole,
  requireRole,
} from '@/common/middleware/auth.middleware';
import { Roles } from '@/common/types/roles';
import { asyncHandler, validate } from '@/common/utils/validation';
import { repaymentController } from '@/modules/repayments/controller';
import {
  createRepaymentSchema,
  repaymentIdParamSchema,
  repaymentsQuerySchema,
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
 *             required: [loanId, amount, transactionDate]
 *             properties:
 *               loanId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               transactionDate:
 *                 type: string
 *                 format: date-time
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
  requireAnyAuthenticatedRole,
  validate({ query: repaymentsQuerySchema }),
  asyncHandler(repaymentController.list.bind(repaymentController))
);
router.post(
  '/',
  authMiddleware,
  requireRole(Roles.ADMIN, Roles.COLLECTIONS_OFFICER),
  validate({ body: createRepaymentSchema }),
  asyncHandler(repaymentController.create.bind(repaymentController))
);
router.get(
  '/:repayment_id',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ params: repaymentIdParamSchema }),
  asyncHandler(repaymentController.getById.bind(repaymentController))
);
router.put(
  '/:repayment_id',
  authMiddleware,
  requireRole(Roles.ADMIN, Roles.COLLECTIONS_OFFICER),
  validate({ params: repaymentIdParamSchema, body: updateRepaymentSchema }),
  asyncHandler(repaymentController.update.bind(repaymentController))
);
router.delete(
  '/:repayment_id',
  authMiddleware,
  requireRole(Roles.ADMIN, Roles.COLLECTIONS_OFFICER),
  validate({ params: repaymentIdParamSchema }),
  asyncHandler(repaymentController.delete.bind(repaymentController))
);

export default router;
