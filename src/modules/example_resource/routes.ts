import { Router } from 'express';

import { asyncHandler } from '@/common/utils/validation';
import { exampleResourceController } from '@/modules/example_resource/controller';

const router = Router();

/**
 * @openapi
 * /api/v1/example-resource:
 *   get:
 *     tags: [Example Resource]
 *     summary: List placeholder example resources
 *     responses:
 *       200:
 *         description: Placeholder example resource list
 */
router.get(
  '/',
  asyncHandler(exampleResourceController.list.bind(exampleResourceController))
);

export default router;
