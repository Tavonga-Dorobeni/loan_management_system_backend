import Redis from 'ioredis';

import { redisConfig } from '@/common/config/redis.config';
import { logger } from '@/common/utils/logger';

let redisClient: Redis | null = null;

const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password || undefined,
      db: redisConfig.db,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  return redisClient;
};

export const cache = {
  async get(key: string): Promise<string | null> {
    try {
      return await getRedisClient().get(key);
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache get fallback triggered');
      return null;
    }
  },
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await getRedisClient().set(key, value, 'EX', ttlSeconds);
        return;
      }
      await getRedisClient().set(key, value);
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache set fallback triggered');
    }
  },
  async del(key: string): Promise<void> {
    try {
      await getRedisClient().del(key);
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache delete fallback triggered');
    }
  },
};
