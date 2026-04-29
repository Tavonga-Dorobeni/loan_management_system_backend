import { Op } from 'sequelize';

import { emailService } from '@/common/notifications/email.service';
import { NotificationDeliveryModel } from '@/modules/notifications/model';
import { notificationService } from '@/modules/notifications/services/notification.service';
import { UserModel } from '@/modules/users/model';

describe('NotificationService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('persists skipped deliveries when no recipients resolve', async () => {
    jest.spyOn(NotificationDeliveryModel, 'create').mockResolvedValue({} as never);

    await notificationService.publish({
      eventType: 'unknown.event',
      metadata: { sample: true },
    });

    expect(NotificationDeliveryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'unknown.event',
        recipient: 'unresolved',
        status: 'skipped',
      })
    );
  });

  it('persists failed deliveries when email dispatch throws', async () => {
    jest.spyOn(UserModel, 'findAll').mockResolvedValue([
      {
        email: 'analyst@example.com',
      },
    ] as never);
    jest.spyOn(emailService, 'send').mockRejectedValue(new Error('resend down'));
    jest.spyOn(NotificationDeliveryModel, 'create').mockResolvedValue({} as never);

    await notificationService.publish({
      eventType: 'loan.created',
      actorUserId: 1,
      reference: 'LN-001',
      metadata: {
        loanId: 1,
      },
    });

    expect(NotificationDeliveryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'loan.created',
        recipient: 'analyst@example.com',
        status: 'failed',
        errorMessage: 'resend down',
      })
    );
  });

  it('builds list filters and maps notification deliveries', async () => {
    jest.spyOn(NotificationDeliveryModel, 'findAndCountAll').mockResolvedValue({
      rows: [
        {
          id: 5,
          eventType: 'loan.created',
          recipient: 'analyst@example.com',
          subject: 'New loan pending approval',
          status: 'failed',
          providerMessageId: null,
          errorMessage: 'resend down',
          createdAt: new Date('2026-04-29T10:00:00.000Z'),
          updatedAt: new Date('2026-04-29T10:00:00.000Z'),
        },
      ],
      count: 1,
    } as never);

    const result = await notificationService.listDeliveries({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
      eventType: 'loan.created',
      status: 'failed',
      recipient: 'analyst',
      search: 'loan',
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-30T23:59:59.999Z',
    });

    expect(NotificationDeliveryModel.findAndCountAll).toHaveBeenCalledWith({
      where: expect.objectContaining({
        eventType: 'loan.created',
        status: 'failed',
        recipient: {
          [Op.like]: '%analyst%',
        },
        [Op.or]: [
          { eventType: { [Op.like]: '%loan%' } },
          { recipient: { [Op.like]: '%loan%' } },
          { subject: { [Op.like]: '%loan%' } },
        ],
        createdAt: {
          [Op.gte]: new Date('2026-04-01T00:00:00.000Z'),
          [Op.lte]: new Date('2026-04-30T23:59:59.999Z'),
        },
      }),
      order: [['createdAt', 'DESC']],
      limit: 20,
      offset: 0,
    });
    expect(result).toEqual({
      items: [
        {
          id: 5,
          eventType: 'loan.created',
          recipient: 'analyst@example.com',
          subject: 'New loan pending approval',
          status: 'failed',
          providerMessageId: null,
          errorMessage: 'resend down',
          createdAt: '2026-04-29T10:00:00.000Z',
          updatedAt: '2026-04-29T10:00:00.000Z',
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });
  });
});
