import pino from 'pino';

import { config } from '@/common/config';

export const logger = pino({
  level: config.log.level,
  base: undefined,
});
