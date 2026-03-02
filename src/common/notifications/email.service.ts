export interface EmailPayload {
  to: string;
  subject: string;
  template?: string;
  variables?: Record<string, unknown>;
}

export class EmailService {
  async send(
    payload: EmailPayload
  ): Promise<{ accepted: boolean; previewId: string | null }> {
    // TODO: Replace placeholder email dispatch with a real provider integration.
    return {
      accepted: true,
      previewId:
        payload.to && payload.subject
          ? `${payload.to}:${payload.subject}`
          : null,
    };
  }
}

export const emailService = new EmailService();
