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
 *     summary: Login endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Access token payload
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registration endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, loan_officer, credit_analyst, collections_officer, customer_support]
 *     responses:
 *       201:
 *         description: Registration result
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
