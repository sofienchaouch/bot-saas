import pino from 'pino';
import { NODE_ENV } from '../config';

export const logger = pino({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  transport: NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
    : undefined,
});
