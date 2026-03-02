import { Sequelize } from 'sequelize';

import { config } from '@/common/config';

export const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'mysql',
    logging: config.env === 'development' ? false : false,
    dialectOptions: config.database.ssl
      ? { ssl: { rejectUnauthorized: false } }
      : {},
    pool: {
      max: config.database.pool.max,
      min: config.database.pool.min,
      idle: config.database.pool.idle,
      acquire: config.database.pool.acquire,
    },
  }
);
