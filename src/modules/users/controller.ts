import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { userService } from '@/modules/users/services/user.service';

export class UserController {
  async list(_req: Request, res: Response): Promise<Response> {
    const users = await userService.list();
    return sendSuccess(res, users);
  }

  async getById(req: Request, res: Response): Promise<Response> {
    const user = await userService.getById(String(req.params.user_id));
    return sendSuccess(res, user);
  }

  async create(req: Request, res: Response): Promise<Response> {
    const user = await userService.create(req.body);
    return sendSuccess(res, user, 'User scaffold created', 201);
  }

  async update(req: Request, res: Response): Promise<Response> {
    const user = await userService.update(String(req.params.user_id), req.body);
    return sendSuccess(res, user, 'User scaffold updated');
  }

  async delete(req: Request, res: Response): Promise<Response> {
    const result = await userService.delete(String(req.params.user_id));
    return sendSuccess(res, result, 'User scaffold deleted');
  }
}

export const userController = new UserController();
