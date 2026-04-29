import pino, { type LoggerOptions, type TransportSingleOptions } from 'pino';

import { config } from '@/common/config';

const createPrettyTransport = (): TransportSingleOptions | undefined => {
  if (config.env !== 'development') {
    return undefined;
  }

  try {
    require.resolve('pino-pretty');

    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: 'HH:mm:ss Z',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
      },
    };
  } catch {
    console.warn(
      '[logger] pino-pretty is not installed; falling back to standard JSON logs.'
    );
    return undefined;
  }
};

const loggerOptions: LoggerOptions = {
  level: config.log.level,
};

const prettyTransport = createPrettyTransport();

export const logger = prettyTransport
  ? pino({
      ...loggerOptions,
      transport: prettyTransport,
    })
  : pino(loggerOptions);

