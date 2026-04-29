import { Router } from 'express';

import {
  authMiddleware,
  requireAnyAuthenticatedRole,
  requireRole,
} from '@/common/middleware/auth.middleware';
import { Roles } from '@/common/types/roles';
import { asyncHandler, validate } from '@/common/utils/validation';
import { borrowerController } from '@/modules/borrowers/controller';
import {
  borrowerIdParamSchema,
  borrowersQuerySchema,
  createBorrowerSchema,
  updateBorrowerSchema,
} from '@/modules/borrowers/validators';
import { loansQuerySchema } from '@/modules/loans/validators';

const router = Router();

/**
 * @openapi
 * /api/v1/borrowers:
 *   get:
 *     tags: [Borrowers]
 *     summary: List borrowers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Borrowers retrieved successfully
 *   post:
 *     tags: [Borrowers]
 *     summary: Create a borrower
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, ecNumber, idNumber]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               ecNumber:
 *                 type: string
 *               idNumber:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *                 nullable: true
 *               email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Borrower created successfully
 * /api/v1/borrowers/{borrower_id}:
 *   get:
 *     tags: [Borrowers]
 *     summary: Get borrower by id
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
 *         description: Borrower retrieved successfully
 *   put:
 *     tags: [Borrowers]
 *     summary: Update borrower
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: borrower_id
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
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               ecNumber:
 *                 type: string
 *               idNumber:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *                 nullable: true
 *               email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Borrower updated successfully
 *   delete:
 *     tags: [Borrowers]
 *     summary: Delete borrower
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
 *         description: Borrower deleted successfully
 */
router.get(
  '/',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: borrowersQuerySchema }),
  asyncHandler(borrowerController.list.bind(borrowerController))
);
router.post(
  '/',
  authMiddleware,
  requireRole(Roles.ADMIN, Roles.LOAN_OFFICER),
  validate({ body: createBorrowerSchema }),
  asyncHandler(borrowerController.create.bind(borrowerController))
);
router.get(
  '/:borrower_id',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ params: borrowerIdParamSchema }),
  asyncHandler(borrowerController.getById.bind(borrowerController))
);
router.put(
  '/:borrower_id',
  authMiddleware,
  requireRole(Roles.ADMIN, Roles.LOAN_OFFICER, Roles.CUSTOMER_SUPPORT),
  validate({ params: borrowerIdParamSchema, body: updateBorrowerSchema }),
  asyncHandler(borrowerController.update.bind(borrowerController))
);
router.delete(
  '/:borrower_id',
  authMiddleware,
  requireRole(Roles.ADMIN, Roles.LOAN_OFFICER),
  validate({ params: borrowerIdParamSchema }),
  asyncHandler(borrowerController.delete.bind(borrowerController))
);
router.get(
  '/:borrower_id/profile',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ params: borrowerIdParamSchema }),
  asyncHandler(borrowerController.getProfile.bind(borrowerController))
);
router.get(
  '/:borrower_id/loans',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ params: borrowerIdParamSchema, query: loansQuerySchema }),
  asyncHandler(borrowerController.listLoans.bind(borrowerController))
);

export default router;
