import { Router } from 'express';

import { authMiddleware } from '@/common/middleware/auth.middleware';
import { asyncHandler } from '@/common/utils/validation';
import { sessionController } from '@/modules/sessions/controller';

const router = Router();

/**
 * @openapi
 * /api/v1/sessions:
 *   get:
 *     tags: [Sessions]
 *     summary: List placeholder sessions for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Placeholder session list
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(sessionController.list.bind(sessionController))
);

export default router;
