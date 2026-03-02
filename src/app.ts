import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { config } from '@/common/config';
import {
  errorMiddleware,
  notFoundMiddleware,
} from '@/common/middleware/error.middleware';
import { loggingMiddleware } from '@/common/middleware/logging.middleware';
import { apiRateLimiter } from '@/common/middleware/rate-limit.middleware';
import authRoutes from '@/modules/auth/routes';
import exampleResourceRoutes from '@/modules/example_resource/routes';
import fileRoutes from '@/modules/files/routes';
import sessionRoutes from '@/modules/sessions/routes';
import userRoutes from '@/modules/users/routes';
import { registerAuthPlugin } from '@/plugins/auth.plugin';
import { registerSwagger } from '@/plugins/swagger.plugin';

export const createApp = (): express.Application => {
  const app = express();

  app.use(loggingMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: config.api.corsOrigin === '*' ? true : config.api.corsOrigin,
    })
  );
  app.use(apiRateLimiter);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  registerAuthPlugin(app);
  registerSwagger(app);

  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [Health]
   *     summary: Basic health check
   *     responses:
   *       200:
   *         description: Service is healthy
   * /health/ready:
   *   get:
   *     tags: [Health]
   *     summary: Readiness check
   *     responses:
   *       200:
   *         description: Service is ready
   * /health/live:
   *   get:
   *     tags: [Health]
   *     summary: Liveness check
   *     responses:
   *       200:
   *         description: Service is live
   */
  app.get('/health', (_req, res) =>
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    })
  );
  app.get('/health/ready', (_req, res) =>
    res.status(200).json({
      success: true,
      data: {
        status: 'ready',
      },
    })
  );
  app.get('/health/live', (_req, res) =>
    res.status(200).json({
      success: true,
      data: {
        status: 'live',
      },
    })
  );

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/files', fileRoutes);
  app.use('/api/v1/sessions', sessionRoutes);
  app.use('/api/v1/example-resource', exampleResourceRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
