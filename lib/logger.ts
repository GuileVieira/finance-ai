import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

/**
 * Cria um child logger com contexto (ex: módulo, requestId).
 *
 * Uso:
 *   const log = createLogger('ofx-upload');
 *   log.info({ fileName }, 'Arquivo recebido');
 */
export function createLogger(module: string) {
  return logger.child({ module });
}
