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
  repaymentScheduleQuerySchema,
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
 *     parameters:
 *       - in: query
 *         name: periodYear
 *         schema:
 *           type: integer
 *       - in: query
 *         name: periodMonth
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Repayments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           loanId:
 *                             type: integer
 *                           loanReference:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           transactionDate:
 *                             type: string
 *                             format: date-time
 *                           periodYear:
 *                             type: integer
 *                           periodMonth:
 *                             type: integer
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
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
 *             required: [loanId, amount, transactionDate, periodYear, periodMonth]
 *             properties:
 *               loanId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               transactionDate:
 *                 type: string
 *                 format: date-time
 *               periodYear:
 *                 type: integer
 *               periodMonth:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Repayment created successfully
 * /api/v1/repayments/schedule:
 *   get:
 *     tags: [Repayments]
 *     summary: Get the portfolio repayment schedule for a year
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Repayment schedule retrieved successfully
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     loanId:
 *                       type: integer
 *                     loanReference:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     transactionDate:
 *                       type: string
 *                       format: date-time
 *                     periodYear:
 *                       type: integer
 *                     periodMonth:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
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
 *               periodYear:
 *                 type: integer
 *               periodMonth:
 *                 type: integer
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
router.get(
  '/schedule',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: repaymentScheduleQuerySchema }),
  asyncHandler(repaymentController.schedule.bind(repaymentController))
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
