import { Router } from 'express';

import { authMiddleware, requireRole } from '@/common/middleware/auth.middleware';
import { Roles } from '@/common/types/roles';
import { asyncHandler, validate } from '@/common/utils/validation';
import { activityLogController } from '@/modules/activity_logs/controller';
import { activityLogsQuerySchema } from '@/modules/activity_logs/validators';

const router = Router();

/**
 * @openapi
 * /api/v1/activity-logs:
 *   get:
 *     tags: [Activity Logs]
 *     summary: List activity logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: actorUserId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: actorRole
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sourceType
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
 */
router.get(
  '/',
  authMiddleware,
  requireRole(Roles.ADMIN),
  validate({ query: activityLogsQuerySchema }),
  asyncHandler(activityLogController.list.bind(activityLogController))
);

export default router;
