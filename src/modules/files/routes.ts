import { Router } from 'express';

import { authMiddleware } from '@/common/middleware/auth.middleware';
import { asyncHandler } from '@/common/utils/validation';
import { fileController } from '@/modules/files/controller';

const router = Router();

/**
 * @openapi
 * /api/v1/files:
 *   get:
 *     tags: [Files]
 *     summary: List placeholder files
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Placeholder file list
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(fileController.list.bind(fileController))
);

export default router;
