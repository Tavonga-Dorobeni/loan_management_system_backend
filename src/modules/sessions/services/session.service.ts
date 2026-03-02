import type { SessionResponseDto } from '@/modules/sessions/dto';

export class SessionService {
  async listForCurrentUser(userId: string): Promise<SessionResponseDto[]> {
    // TODO: Replace placeholder session retrieval with a real session store.
    return [
      {
        id: '40000000-0000-0000-0000-000000000001',
        userId,
        tokenId: 'placeholder-token-id',
        status: 'active',
        expiresAt: null,
      },
    ];
  }
}

export const sessionService = new SessionService();
