import { Op } from 'sequelize';

import { logger } from '@/common/utils/logger';
import {
  buildListEnvelope,
  getOffset,
  type ListEnvelope,
  type ListQueryParams,
} from '@/common/utils/list';
import type { Roles } from '@/common/types/roles';
import type { ActivityLogResponseDto } from '@/modules/activity_logs/dto';
import { ActivityLogModel } from '@/modules/activity_logs/model';

export interface ActivityLogRecordInput {
  actorUserId?: number | null;
  actorRole?: Roles | null;
  entityType: string;
  entityId?: string | number | null;
  action: string;
  summary: string;
  metadata?: Record<string, unknown> | null;
  sourceType: 'api' | 'import' | 'system';
  sourceReference?: string | null;
}

export interface ActivityLogListQuery extends ListQueryParams {
  actorUserId?: number;
  actorRole?: string;
  entityType?: string;
  entityId?: string;
  sourceType?: string;
  from?: string;
  to?: string;
}

const toActivityLogResponse = (
  log: ActivityLogModel
): ActivityLogResponseDto => ({
  id: log.id,
  actorUserId: log.actorUserId,
  actorRole: log.actorRole,
  entityType: log.entityType,
  entityId: log.entityId,
  action: log.action,
  summary: log.summary,
  metadata: log.metadata,
  sourceType: log.sourceType,
  sourceReference: log.sourceReference,
  createdAt: log.createdAt.toISOString(),
});

export class ActivityLogService {
  async record(input: ActivityLogRecordInput): Promise<void> {
    try {
      await ActivityLogModel.create({
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        entityType: input.entityType,
        entityId:
          input.entityId === undefined || input.entityId === null
            ? null
            : String(input.entityId),
        action: input.action,
        summary: input.summary,
        metadata: input.metadata ?? null,
        sourceType: input.sourceType,
        sourceReference: input.sourceReference ?? null,
      });
    } catch (error) {
      logger.error({ err: error, action: input.action }, 'Failed to record activity log');
    }
  }

  async list(query: ActivityLogListQuery): Promise<ListEnvelope<ActivityLogResponseDto>> {
    const where: Record<PropertyKey, unknown> = {};

    if (query.actorUserId !== undefined) {
      where.actorUserId = query.actorUserId;
    }
    if (query.actorRole) {
      where.actorRole = query.actorRole;
    }
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.sourceType) {
      where.sourceType = query.sourceType;
    }
    if (query.search) {
      where[Op.or] = [
        { action: { [Op.like]: `%${query.search}%` } },
        { summary: { [Op.like]: `%${query.search}%` } },
      ];
    }

    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { [Op.gte]: new Date(query.from) } : {}),
        ...(query.to ? { [Op.lte]: new Date(query.to) } : {}),
      };
    }

    const { rows, count } = await ActivityLogModel.findAndCountAll({
      where,
      order: [['createdAt', query.sortOrder.toUpperCase()]],
      limit: query.pageSize,
      offset: getOffset(query.page, query.pageSize),
    });

    return buildListEnvelope(
      rows.map(toActivityLogResponse),
      query.page,
      query.pageSize,
      count
    );
  }
}

export const activityLogService = new ActivityLogService();
