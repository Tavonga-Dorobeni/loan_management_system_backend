import { Op } from 'sequelize';

import { Roles } from '@/common/types/roles';
import { ActivityLogModel } from '@/modules/activity_logs/model';
import { activityLogService } from '@/modules/activity_logs/services/activity-log.service';

describe('ActivityLogService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('swallows write failures when recording activity logs', async () => {
    jest.spyOn(ActivityLogModel, 'create').mockRejectedValue(new Error('write failed'));

    await expect(
      activityLogService.record({
        actorUserId: 1,
        actorRole: Roles.ADMIN,
        entityType: 'loan',
        entityId: 42,
        action: 'loan.created',
        summary: 'created loan',
        sourceType: 'api',
      })
    ).resolves.toBeUndefined();
  });

  it('builds filters and maps list responses', async () => {
    jest.spyOn(ActivityLogModel, 'findAndCountAll').mockResolvedValue({
      rows: [
        {
          id: 11,
          actorUserId: 9,
          actorRole: 'admin',
          entityType: 'loan',
          entityId: '42',
          action: 'loan.status.changed',
          summary: 'changed loan status',
          metadata: { from: 'PENDING', to: 'SUCCESS' },
          sourceType: 'import',
          sourceReference: 'approvals.xlsx',
          createdAt: new Date('2026-04-29T12:00:00.000Z'),
        },
      ],
      count: 1,
    } as never);

    const result = await activityLogService.list({
      page: 2,
      pageSize: 10,
      sortOrder: 'asc',
      search: 'status',
      actorUserId: 9,
      actorRole: 'admin',
      entityType: 'loan',
      entityId: '42',
      sourceType: 'import',
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-30T23:59:59.999Z',
    });

    expect(ActivityLogModel.findAndCountAll).toHaveBeenCalledWith({
      where: expect.objectContaining({
        actorUserId: 9,
        actorRole: 'admin',
        entityType: 'loan',
        entityId: '42',
        sourceType: 'import',
        [Op.or]: [
          { action: { [Op.like]: '%status%' } },
          { summary: { [Op.like]: '%status%' } },
        ],
        createdAt: {
          [Op.gte]: new Date('2026-04-01T00:00:00.000Z'),
          [Op.lte]: new Date('2026-04-30T23:59:59.999Z'),
        },
      }),
      order: [['createdAt', 'ASC']],
      limit: 10,
      offset: 10,
    });
    expect(result).toEqual({
      items: [
        {
          id: 11,
          actorUserId: 9,
          actorRole: 'admin',
          entityType: 'loan',
          entityId: '42',
          action: 'loan.status.changed',
          summary: 'changed loan status',
          metadata: { from: 'PENDING', to: 'SUCCESS' },
          sourceType: 'import',
          sourceReference: 'approvals.xlsx',
          createdAt: '2026-04-29T12:00:00.000Z',
        },
      ],
      pagination: {
        page: 2,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      },
    });
  });
});
