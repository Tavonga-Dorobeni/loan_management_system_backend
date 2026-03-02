import http from 'http';

import { createApp } from '@/app';
import { config } from '@/common/config';
import {
  bootstrapDatabase,
  closeDatabase,
  initializeModels,
  setupAssociations,
} from '@/common/database';
import { logger } from '@/common/utils/logger';

let server: http.Server | null = null;

const startServer = async (): Promise<void> => {
  try {
    initializeModels();
    setupAssociations();

    try {
      await bootstrapDatabase();
    } catch (error) {
      if (config.env === 'production') {
        throw error;
      }

      logger.warn(
        { err: error },
        'Database bootstrap skipped outside production'
      );
    }

    const app = createApp();
    server = app.listen(config.server.port, config.server.host, () => {
      logger.info(
        { host: config.server.host, port: config.server.port, env: config.env },
        'HTTP server started'
      );
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Shutdown signal received');

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await closeDatabase();
  process.exit(0);
};

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void startServer();
