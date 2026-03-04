import bcrypt from 'bcrypt';
import type {
  ChangePasswordDto,
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '@/modules/users/dto';

import { Roles } from '@/common/types/roles';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '@/common/utils/errors';
import { UserModel } from '@/modules/users/model';

const toUserResponse = (user: UserModel): UserResponseDto => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

export class UserService {
  async list(): Promise<UserResponseDto[]> {
    const users = await UserModel.findAll({
      order: [['createdAt', 'DESC']],
    });

    return users.map(toUserResponse);
  }

  async getById(userId: number): Promise<UserResponseDto> {
    const user = await UserModel.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return toUserResponse(user);
  }

  async create(payload: CreateUserDto): Promise<UserResponseDto> {
    const existing = await UserModel.findOne({
      where: {
        email: payload.email,
      },
    });

    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const passwordHash = payload.password
      ? await bcrypt.hash(payload.password, 12)
      : null;

    const user = await UserModel.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      role: payload.role ?? Roles.LOAN_OFFICER,
      status: 'active',
      passwordHash,
    });

    return toUserResponse(user);
  }

  async update(
    userId: number,
    payload: UpdateUserDto
  ): Promise<UserResponseDto> {
    const user = await UserModel.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await user.update({
      firstName: payload.firstName ?? user.firstName,
      lastName: payload.lastName ?? user.lastName,
      role: payload.role ?? user.role,
      status: payload.status ?? user.status,
    });

    return toUserResponse(user);
  }

  async delete(userId: number): Promise<{ id: number; deleted: boolean }> {
    const user = await UserModel.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await user.destroy();

    return {
      id: userId,
      deleted: true,
    };
  }

  async changePassword(
    userId: number,
    payload: ChangePasswordDto
  ): Promise<{ changed: boolean }> {
    const user = await UserModel.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError('Password is not set for this user');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      payload.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(payload.newPassword, 12);

    await user.update({
      passwordHash: newPasswordHash,
    });

    return {
      changed: true,
    };
  }
}

export const userService = new UserService();
