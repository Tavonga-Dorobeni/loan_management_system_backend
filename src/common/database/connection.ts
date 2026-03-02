import { sequelize } from '@/common/config/database.config';
import { logger } from '@/common/utils/logger';

export const connectDatabase = async (): Promise<void> => {
  await sequelize.authenticate();
  logger.info('Database connection established');
};

export const closeDatabase = async (): Promise<void> => {
  await sequelize.close();
  logger.info('Database connection closed');
};
