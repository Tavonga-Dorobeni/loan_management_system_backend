import { Router } from 'express';

import { authMiddleware, requireRole } from '@/common/middleware/auth.middleware';
import { Roles } from '@/common/types/roles';
import { asyncHandler, validate } from '@/common/utils/validation';
import { notificationController } from '@/modules/notifications/controller';
import { notificationDeliveriesQuerySchema } from '@/modules/notifications/validators';

const router = Router();

/**
 * @openapi
 * /api/v1/notifications/deliveries:
 *   get:
 *     tags: [Notifications]
 *     summary: List notification deliveries
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
 *         name: eventType
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [sent, failed, skipped]
 *       - in: query
 *         name: recipient
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
 *         description: Notification deliveries retrieved successfully. Delivery `status` is one of `sent`, `failed`, or `skipped`.
 */
router.get(
  '/deliveries',
  authMiddleware,
  requireRole(Roles.ADMIN),
  validate({ query: notificationDeliveriesQuerySchema }),
  asyncHandler(notificationController.listDeliveries.bind(notificationController))
);

export default router;
