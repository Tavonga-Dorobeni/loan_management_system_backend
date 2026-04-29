import { Op } from 'sequelize';

import { emailService } from '@/common/notifications/email.service';
import {
  buildListEnvelope,
  getOffset,
  type ListEnvelope,
  type ListQueryParams,
} from '@/common/utils/list';
import { logger } from '@/common/utils/logger';
import { Roles } from '@/common/types/roles';
import type {
  NotificationDeliveryResponseDto,
  NotificationDeliveryStatus,
} from '@/modules/notifications/dto';
import { NotificationDeliveryModel } from '@/modules/notifications/model';
import { UserModel } from '@/modules/users/model';

export interface NotificationPublishInput {
  eventType: string;
  actorUserId?: number | null;
  targetUserId?: number | null;
  targetEmail?: string | null;
  reference?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationDeliveryListQuery extends ListQueryParams {
  eventType?: string;
  status?: NotificationDeliveryStatus;
  recipient?: string;
  from?: string;
  to?: string;
}

const toDeliveryResponse = (
  delivery: NotificationDeliveryModel
): NotificationDeliveryResponseDto => ({
  id: delivery.id,
  eventType: delivery.eventType,
  recipient: delivery.recipient,
  subject: delivery.subject,
  status: delivery.status,
  providerMessageId: delivery.providerMessageId,
  errorMessage: delivery.errorMessage,
  createdAt: delivery.createdAt.toISOString(),
  updatedAt: delivery.updatedAt.toISOString(),
});

const uniqueEmails = (emails: Array<string | null | undefined>): string[] => {
  return Array.from(
    new Set(
      emails
        .filter((email): email is string => Boolean(email))
        .map((email) => email.trim().toLowerCase())
    )
  );
};

export class NotificationService {
  private async getUserEmailById(userId?: number | null): Promise<string | null> {
    if (!userId) {
      return null;
    }

    const user = await UserModel.findByPk(userId);
    return user?.email ?? null;
  }

  private async getEmailsByRoles(roles: Roles[]): Promise<string[]> {
    const users = await UserModel.findAll({
      where: {
        role: {
          [Op.in]: roles,
        },
      },
    });

    return uniqueEmails(users.map((user) => user.email));
  }

  private async resolveRecipients(input: NotificationPublishInput): Promise<string[]> {
    switch (input.eventType) {
      case 'auth.login.failure.suspicious': {
        const adminEmails = await this.getEmailsByRoles([Roles.ADMIN]);
        return uniqueEmails([input.targetEmail, ...adminEmails]);
      }
      case 'user.registered':
      case 'user.password.changed':
        return uniqueEmails([input.targetEmail]);
      case 'borrower.kyc.uploaded':
        return this.getEmailsByRoles([Roles.ADMIN, Roles.LOAN_OFFICER]);
      case 'loan.created':
        return this.getEmailsByRoles([Roles.CREDIT_ANALYST]);
      case 'loan.status.changed':
        return this.getEmailsByRoles([
          Roles.LOAN_OFFICER,
          Roles.COLLECTIONS_OFFICER,
        ]);
      case 'repayment.created.under':
        return this.getEmailsByRoles([Roles.COLLECTIONS_OFFICER]);
      case 'loan.import.intake.completed':
      case 'loan.import.approval.completed':
      case 'loan.import.repayment.completed': {
        const actorEmail = await this.getUserEmailById(input.actorUserId);
        return uniqueEmails([actorEmail]);
      }
      default:
        return [];
    }
  }

  private buildSubject(input: NotificationPublishInput): string {
    switch (input.eventType) {
      case 'auth.login.failure.suspicious':
        return 'Unusual sign-in attempt';
      case 'user.registered':
        return 'Welcome - your account is ready';
      case 'user.password.changed':
        return 'Your password was changed';
      case 'borrower.kyc.uploaded':
        return 'New KYC document uploaded';
      case 'loan.created':
        return 'New loan pending approval';
      case 'loan.status.changed':
        return `Loan status updated: ${input.reference ?? 'loan'}`;
      case 'repayment.created.under':
        return `Under-payment recorded: ${input.reference ?? 'loan'}`;
      case 'loan.import.intake.completed':
        return 'Intake import finished';
      case 'loan.import.approval.completed':
        return 'Approval import finished';
      case 'loan.import.repayment.completed':
        return 'Repayment import finished';
      default:
        return input.eventType;
    }
  }

  async publish(input: NotificationPublishInput): Promise<void> {
    try {
      const recipients = await this.resolveRecipients(input);
      const subject = this.buildSubject(input);

      if (recipients.length === 0) {
        await NotificationDeliveryModel.create({
          eventType: input.eventType,
          recipient: 'unresolved',
          subject,
          status: 'skipped',
          providerMessageId: null,
          errorMessage: 'No recipients resolved for event',
        });
        return;
      }

      for (const recipient of recipients) {
        try {
          const result = await emailService.send({
            to: recipient,
            subject,
            text: JSON.stringify(input.metadata ?? {}),
          });

          await NotificationDeliveryModel.create({
            eventType: input.eventType,
            recipient,
            subject,
            status: result.accepted ? 'sent' : 'failed',
            providerMessageId: result.previewId,
            errorMessage: result.accepted ? null : 'Email dispatch was skipped',
          });
        } catch (error) {
          await NotificationDeliveryModel.create({
            eventType: input.eventType,
            recipient,
            subject,
            status: 'failed',
            providerMessageId: null,
            errorMessage: error instanceof Error ? error.message : 'Notification failed',
          });
        }
      }
    } catch (error) {
      logger.error({ err: error, eventType: input.eventType }, 'Failed to publish notification');
    }
  }

  async listDeliveries(
    query: NotificationDeliveryListQuery
  ): Promise<ListEnvelope<NotificationDeliveryResponseDto>> {
    const where: Record<PropertyKey, unknown> = {};

    if (query.eventType) {
      where.eventType = query.eventType;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.recipient) {
      where.recipient = {
        [Op.like]: `%${query.recipient}%`,
      };
    }
    if (query.search) {
      where[Op.or] = [
        { eventType: { [Op.like]: `%${query.search}%` } },
        { recipient: { [Op.like]: `%${query.search}%` } },
        { subject: { [Op.like]: `%${query.search}%` } },
      ];
    }
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { [Op.gte]: new Date(query.from) } : {}),
        ...(query.to ? { [Op.lte]: new Date(query.to) } : {}),
      };
    }

    const { rows, count } = await NotificationDeliveryModel.findAndCountAll({
      where,
      order: [['createdAt', query.sortOrder.toUpperCase()]],
      limit: query.pageSize,
      offset: getOffset(query.page, query.pageSize),
    });

    return buildListEnvelope(
      rows.map(toDeliveryResponse),
      query.page,
      query.pageSize,
      count
    );
  }
}

export const notificationService = new NotificationService();
