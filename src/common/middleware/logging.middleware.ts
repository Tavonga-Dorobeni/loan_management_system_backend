import pinoHttp from 'pino-http';

import { logger } from '@/common/utils/logger';

export const loggingMiddleware = pinoHttp({
  logger,
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customProps(req, res) {
    return {
      method: req.method,
      path: req.url,
      statusCode: res.statusCode,
    };
  },
});
