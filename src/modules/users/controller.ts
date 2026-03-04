import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { userService } from '@/modules/users/services/user.service';

export class UserController {
  async list(_req: Request, res: Response): Promise<Response> {
    const users = await userService.list();
    return sendSuccess(res, users, 'Users retrieved successfully');
  }

  async getById(req: Request, res: Response): Promise<Response> {
    const user = await userService.getById(Number(req.params.user_id));
    return sendSuccess(res, user, 'User retrieved successfully');
  }

  async create(req: Request, res: Response): Promise<Response> {
    const user = await userService.create(req.body);
    return sendSuccess(res, user, 'User created successfully', 201);
  }

  async update(req: Request, res: Response): Promise<Response> {
    const user = await userService.update(Number(req.params.user_id), req.body);
    return sendSuccess(res, user, 'User updated successfully');
  }

  async delete(req: Request, res: Response): Promise<Response> {
    const result = await userService.delete(Number(req.params.user_id));
    return sendSuccess(res, result, 'User deleted successfully');
  }

  async changePassword(req: Request, res: Response): Promise<Response> {
    const result = await userService.changePassword(
      Number(req.params.user_id),
      req.body
    );
    return sendSuccess(res, result, 'Password changed successfully');
  }
}

export const userController = new UserController();
