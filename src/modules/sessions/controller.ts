import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { sessionService } from '@/modules/sessions/services/session.service';

export class SessionController {
  async list(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id ?? 'anonymous';
    const sessions = await sessionService.listForCurrentUser(userId);
    return sendSuccess(res, sessions);
  }
}

export const sessionController = new SessionController();
