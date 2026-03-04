import { Resend } from 'resend';

import { config } from '@/common/config';
import { logger } from '@/common/utils/logger';

export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export class EmailService {
  private readonly resendClient: Resend | null;

  constructor() {
    this.resendClient = config.integrations.resend.apiKey
      ? new Resend(config.integrations.resend.apiKey)
      : null;
  }

  async send(
    payload: EmailPayload
  ): Promise<{ accepted: boolean; previewId: string | null }> {
    if (!this.resendClient) {
      logger.warn('RESEND_API_KEY is not configured; email dispatch skipped.');
      return {
        accepted: false,
        previewId: null,
      };
    }

    const response = await this.resendClient.emails.send({
      from: config.integrations.resend.from,
      to: payload.to,
      subject: payload.subject,
      html:
        payload.html ??
        `<p>${payload.text ?? 'This is a scaffolded email message.'}</p>`,
      text: payload.text,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return {
      accepted: true,
      previewId: response.data?.id ?? null,
    };
  }
}

export const emailService = new EmailService();
