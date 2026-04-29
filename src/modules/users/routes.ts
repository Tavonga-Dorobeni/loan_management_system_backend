import { Router } from 'express';

import {
  authMiddleware,
  requireAnyAuthenticatedRole,
  requireRole,
} from '@/common/middleware/auth.middleware';
import { Roles } from '@/common/types/roles';
import { asyncHandler, validate } from '@/common/utils/validation';
import { userController } from '@/modules/users/controller';
import {
  changePasswordSchema,
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  usersQuerySchema,
} from '@/modules/users/validators';

const router = Router();

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Placeholder user list
 *   post:
 *     tags: [Users]
 *     summary: Create a user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [admin, loan_officer, credit_analyst, collections_officer, customer_support]
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Placeholder created user
 */
router.get(
  '/',
  authMiddleware,
  requireRole(Roles.ADMIN),
  validate({ query: usersQuerySchema }),
  asyncHandler(userController.list.bind(userController))
);
router.post(
  '/',
  authMiddleware,
  requireRole(Roles.ADMIN),
  validate({ body: createUserSchema }),
  asyncHandler(userController.create.bind(userController))
);

/**
 * @openapi
 * /api/v1/users/{user_id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by id
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
 *         description: Placeholder user payload
 *   put:
 *     tags: [Users]
 *     summary: Update a user
 *     security:
 *       - bearerAuth: []
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
 *               role:
 *                 type: string
 *                 enum: [admin, loan_officer, credit_analyst, collections_officer, customer_support]
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Placeholder updated user
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Placeholder deletion result
 * /api/v1/users/{user_id}/change-password:
 *   post:
 *     tags: [Users]
 *     summary: Change a user's password
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.get(
  '/:user_id',
  authMiddleware,
  requireRole(Roles.ADMIN),
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.getById.bind(userController))
);
router.put(
  '/:user_id',
  authMiddleware,
  requireRole(Roles.ADMIN),
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  asyncHandler(userController.update.bind(userController))
);
router.delete(
  '/:user_id',
  authMiddleware,
  requireRole(Roles.ADMIN),
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.delete.bind(userController))
);
router.post(
  '/:user_id/change-password',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ params: userIdParamSchema, body: changePasswordSchema }),
  asyncHandler(userController.changePassword.bind(userController))
);

export default router;
