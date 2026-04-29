import pinoHttp from 'pino-http';

import { config } from '@/common/config';
import { logger } from '@/common/utils/logger';

const isDocsAssetRequest = (url: string): boolean => {
  return (
    url.startsWith('/docs') ||
    url.startsWith('/api/v1/docs') ||
    url.includes('swagger-ui') ||
    url.includes('favicon-32x32') ||
    url.includes('favicon-16x16')
  );
};

export const loggingMiddleware = pinoHttp({
  logger,
  autoLogging:
    config.env === 'development'
      ? {
          ignore: (req) => isDocsAssetRequest(req.url || ''),
        }
      : true,
  customLogLevel(_req, res, error) {
    if (error || res.statusCode >= 500) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} -> ${res.statusCode}`;
  },
});
