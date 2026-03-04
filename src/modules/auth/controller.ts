import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { authService } from '@/modules/auth/services/auth.service';

export class AuthController {
  async login(req: Request, res: Response): Promise<Response> {
    const result = await authService.login(req.body);
    return sendSuccess(res, result, 'Login successful');
  }

  async register(req: Request, res: Response): Promise<Response> {
    const result = await authService.register(req.body);
    return sendSuccess(res, result, 'Registration successful', 201);
  }
}

export const authController = new AuthController();
