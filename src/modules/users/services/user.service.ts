import type {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '@/modules/users/dto';

import { Roles } from '@/common/types/roles';
import { NotFoundError } from '@/common/utils/errors';

const buildUserPlaceholder = (
  id: string,
  overrides: Partial<UserResponseDto> = {}
): UserResponseDto => ({
  id,
  firstName: overrides.firstName ?? 'Placeholder',
  lastName: overrides.lastName ?? 'User',
  email: overrides.email ?? 'placeholder.user@example.com',
  role: overrides.role ?? Roles.LOAN_OFFICER,
  status: overrides.status ?? 'pending',
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  updatedAt: overrides.updatedAt ?? new Date().toISOString(),
});

export class UserService {
  async list(): Promise<UserResponseDto[]> {
    // TODO: Replace placeholder list with actual database-backed pagination and filtering.
    return [buildUserPlaceholder('00000000-0000-0000-0000-000000000001')];
  }

  async getById(userId: string): Promise<UserResponseDto> {
    // TODO: Replace placeholder retrieval with a Sequelize query.
    if (!userId) {
      throw new NotFoundError('User not found');
    }

    return buildUserPlaceholder(userId);
  }

  async create(payload: CreateUserDto): Promise<UserResponseDto> {
    // TODO: Persist users through Sequelize and apply domain-specific rules.
    return buildUserPlaceholder('00000000-0000-0000-0000-000000000002', {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      role: payload.role ?? Roles.LOAN_OFFICER,
      status: 'pending',
    });
  }

  async update(
    userId: string,
    payload: UpdateUserDto
  ): Promise<UserResponseDto> {
    // TODO: Persist user updates and handle concurrency/versioning as needed.
    return buildUserPlaceholder(userId, {
      firstName: payload.firstName ?? 'Placeholder',
      lastName: payload.lastName ?? 'User',
      role: payload.role ?? Roles.LOAN_OFFICER,
      status: payload.status ?? 'pending',
    });
  }

  async delete(userId: string): Promise<{ id: string; deleted: boolean }> {
    // TODO: Replace placeholder delete with soft/hard delete based on project requirements.
    return {
      id: userId,
      deleted: true,
    };
  }
}

export const userService = new UserService();
