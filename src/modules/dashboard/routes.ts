import { Router } from 'express';

import { authMiddleware, requireAnyAuthenticatedRole } from '@/common/middleware/auth.middleware';
import { asyncHandler, validate } from '@/common/utils/validation';
import { reportsController } from '@/modules/reports/controller';
import { reportQuerySchema } from '@/modules/reports/validators';

const router = Router();

/**
 * @openapi
 * /api/v1/dashboard/portfolio-summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Portfolio summary dashboard metrics
 *     description: Returns a success envelope whose `data` contains the canonical dashboard metrics plus `recentImports`, `approvalTrend`, and `repaymentTrend`.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Portfolio summary retrieved successfully
 */
router.get(
  '/portfolio-summary',
  authMiddleware,
  requireAnyAuthenticatedRole,
  validate({ query: reportQuerySchema }),
  asyncHandler(reportsController.portfolioSummary.bind(reportsController))
);

export default router;
