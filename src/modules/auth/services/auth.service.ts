import bcrypt from 'bcrypt';

import { signAccessToken } from '@/common/config/auth';
import { Roles } from '@/common/types/roles';
import type { LoginDto, RegisterDto } from '@/modules/auth/dto';

export class AuthService {
  async login(
    payload: LoginDto
  ): Promise<{ accessToken: string; user: Record<string, unknown> }> {
    // TODO: Replace placeholder auth lookup and password verification with real user/session logic.
    await bcrypt.hash(payload.password, 10);

    return {
      accessToken: signAccessToken({
        sub: '20000000-0000-0000-0000-000000000001',
        email: payload.email,
        role: Roles.ADMIN,
      }),
      user: {
        id: '20000000-0000-0000-0000-000000000001',
        email: payload.email,
        role: Roles.ADMIN,
      },
    };
  }

  async register(
    payload: RegisterDto
  ): Promise<{ userId: string; status: string }> {
    // TODO: Replace placeholder registration flow with actual persistence and verification steps.
    await bcrypt.hash(payload.password, 10);

    return {
      userId: '20000000-0000-0000-0000-000000000002',
      status: `registered:${payload.email}`,
    };
  }
}

export const authService = new AuthService();
