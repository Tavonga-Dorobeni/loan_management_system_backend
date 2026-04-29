import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import type {
  ChangePasswordDto,
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '@/modules/users/dto';

import { type ListEnvelope, buildListEnvelope, getOffset } from '@/common/utils/list';
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

export interface UserListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  role?: string;
  status?: string;
}

export class UserService {
  async list(query: UserListQuery): Promise<ListEnvelope<UserResponseDto>> {
    const where: Record<PropertyKey, unknown> = {};

    if (query.role) {
      where.role = query.role;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${query.search}%` } },
        { lastName: { [Op.like]: `%${query.search}%` } },
        { email: { [Op.like]: `%${query.search}%` } },
      ];
    }

    const sortField = query.sortBy ?? 'createdAt';
    const { rows, count } = await UserModel.findAndCountAll({
      where,
      order: [[sortField, query.sortOrder.toUpperCase()]],
      limit: query.pageSize,
      offset: getOffset(query.page, query.pageSize),
    });

    return buildListEnvelope(
      rows.map(toUserResponse),
      query.page,
      query.pageSize,
      count
    );
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
    payload: ChangePasswordDto,
    actor: { id: number; role: Roles }
  ): Promise<{ changed: boolean }> {
    const user = await UserModel.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isSelf = actor.id === userId;
    const isAdmin = actor.role === Roles.ADMIN;
    if (!isSelf && !isAdmin) {
      throw new UnauthorizedError('You cannot change another user password');
    }

    if (!isAdmin && !payload.currentPassword) {
      throw new UnauthorizedError('Current password is required');
    }

    if (!isAdmin && !user.passwordHash) {
      throw new UnauthorizedError('Password is not set for this user');
    }

    if (!isAdmin) {
      const isCurrentPasswordValid = await bcrypt.compare(
        payload.currentPassword,
        user.passwordHash as string
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }
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
