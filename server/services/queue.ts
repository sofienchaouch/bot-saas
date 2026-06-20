import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { REDIS_URL } from '../config';

export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: 2000,
  retryStrategy: () => null, // do not retry — fail fast
});

export const crawlQueue = new Queue('crawl', { connection: redisConnection });
export const outboundMessageQueue = new Queue('outbound-message', { connection: redisConnection });
export const webhookRetryQueue = new Queue('webhook-retry', { connection: redisConnection });
