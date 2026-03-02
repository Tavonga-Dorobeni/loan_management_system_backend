import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  HOST: Joi.string().default('localhost'),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(3306),
  DB_NAME: Joi.string().default('app_dev'),
  DB_USER: Joi.string().default('root'),
  DB_PASS: Joi.string().allow('').default(''),
  DB_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  DB_POOL_MAX: Joi.number().default(10),
  DB_POOL_MIN: Joi.number().default(0),
  DB_POOL_IDLE: Joi.number().default(10000),
  DB_POOL_ACQUIRE: Joi.number().default(30000),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),
  LOG_LEVEL: Joi.string().default('info'),
  API_BASE_URL: Joi.string().uri().default('http://localhost:3000'),
  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: Joi.number().default(100),
})
  .unknown()
  .required();

const { error, value } = envSchema.validate(process.env, {
  abortEarly: false,
  convert: true,
});

if (error) {
  throw new Error(`Configuration validation error: ${error.message}`);
}

export const config = {
  env: value.NODE_ENV as 'development' | 'test' | 'production',
  server: {
    port: value.PORT as number,
    host: value.HOST as string,
  },
  database: {
    host: value.DB_HOST as string,
    port: value.DB_PORT as number,
    name: value.DB_NAME as string,
    user: value.DB_USER as string,
    password: value.DB_PASS as string,
    ssl: value.DB_SSL as boolean,
    pool: {
      max: value.DB_POOL_MAX as number,
      min: value.DB_POOL_MIN as number,
      idle: value.DB_POOL_IDLE as number,
      acquire: value.DB_POOL_ACQUIRE as number,
    },
  },
  auth: {
    jwtSecret: value.JWT_SECRET as string,
    jwtExpiresIn: value.JWT_EXPIRES_IN as string,
  },
  redis: {
    host: value.REDIS_HOST as string,
    port: value.REDIS_PORT as number,
    password: value.REDIS_PASSWORD as string,
    db: value.REDIS_DB as number,
  },
  log: {
    level: value.LOG_LEVEL as string,
  },
  api: {
    baseUrl: value.API_BASE_URL as string,
    corsOrigin: value.CORS_ORIGIN as string,
  },
  rateLimit: {
    windowMs: value.RATE_LIMIT_WINDOW_MS as number,
    max: value.RATE_LIMIT_MAX as number,
  },
};
