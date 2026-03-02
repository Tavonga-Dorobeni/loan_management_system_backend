import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { fileService } from '@/modules/files/services/file.service';

export class FileController {
  async list(_req: Request, res: Response): Promise<Response> {
    const files = await fileService.list();
    return sendSuccess(res, files);
  }
}

export const fileController = new FileController();
