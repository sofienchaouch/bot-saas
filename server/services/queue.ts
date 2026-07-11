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
export const outboundMessageQueue = new Queue('outbound-message', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 200,
    removeOnFail: 100,
  },
});
