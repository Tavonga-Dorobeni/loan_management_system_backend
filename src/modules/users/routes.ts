import { Router } from 'express';

import { authMiddleware } from '@/common/middleware/auth.middleware';
import { asyncHandler, validate } from '@/common/utils/validation';
import { userController } from '@/modules/users/controller';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
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
 *     responses:
 *       201:
 *         description: Placeholder created user
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(userController.list.bind(userController))
);
router.post(
  '/',
  authMiddleware,
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
 *           type: string
 *     responses:
 *       200:
 *         description: Placeholder user payload
 *   put:
 *     tags: [Users]
 *     summary: Update a user
 *     security:
 *       - bearerAuth: []
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
 */
router.get(
  '/:user_id',
  authMiddleware,
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.getById.bind(userController))
);
router.put(
  '/:user_id',
  authMiddleware,
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  asyncHandler(userController.update.bind(userController))
);
router.delete(
  '/:user_id',
  authMiddleware,
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.delete.bind(userController))
);

export default router;
