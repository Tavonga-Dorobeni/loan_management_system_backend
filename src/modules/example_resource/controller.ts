import type { Request, Response } from 'express';

import { sendSuccess } from '@/common/utils/response';
import { exampleResourceService } from '@/modules/example_resource/services/example-resource.service';

export class ExampleResourceController {
  async list(_req: Request, res: Response): Promise<Response> {
    const resources = await exampleResourceService.list();
    return sendSuccess(res, resources);
  }
}

export const exampleResourceController = new ExampleResourceController();
