import pino from 'pino';

export const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: 'HH:mm:ss Z',
      ignore: 'pid,hostname',
      messageFormat: '{msg}',
    },
  },
});

