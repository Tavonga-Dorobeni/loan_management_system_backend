import bcrypt from 'bcrypt';

import { signAccessToken } from '@/common/config/auth';
import { Roles } from '@/common/types/roles';
import { ConflictError, UnauthorizedError } from '@/common/utils/errors';
import type { LoginDto, RegisterDto } from '@/modules/auth/dto';
import { UserModel } from '@/modules/users/model';

export class AuthService {
  async login(
    payload: LoginDto
  ): Promise<{ token: string; user: Record<string, unknown> }> {
    const user = await UserModel.findOne({
      where: {
        email: payload.email,
      },
    });

    if (!user || !user.passwordHash || user.status === 'disabled') {
      throw new UnauthorizedError('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
    };
  }

  async register(
    payload: RegisterDto
  ): Promise<{ user: Record<string, unknown> }> {
    const existing = await UserModel.findOne({
      where: {
        email: payload.email,
      },
    });

    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    const user = await UserModel.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      role: payload.role ?? Roles.LOAN_OFFICER,
      status: 'active',
      passwordHash,
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }
}

export const authService = new AuthService();
