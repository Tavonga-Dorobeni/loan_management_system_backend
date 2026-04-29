export type NotificationDeliveryStatus = 'sent' | 'failed' | 'skipped';

export interface NotificationDeliveryResponseDto {
  id: number;
  eventType: string;
  recipient: string;
  subject: string;
  status: NotificationDeliveryStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
