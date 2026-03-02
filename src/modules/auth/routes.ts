import { Router } from 'express';

import { asyncHandler, validate } from '@/common/utils/validation';
import { authController } from '@/modules/auth/controller';
import { loginSchema, registerSchema } from '@/modules/auth/validators';

const router = Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Placeholder login endpoint
 *     responses:
 *       200:
 *         description: Placeholder access token payload
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Placeholder registration endpoint
 *     responses:
 *       201:
 *         description: Placeholder registration result
 */
router.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(authController.login.bind(authController))
);
router.post(
  '/register',
  validate({ body: registerSchema }),
  asyncHandler(authController.register.bind(authController))
);

export default router;
