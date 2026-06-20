import { Worker, Job } from 'bullmq';
import { redisConnection } from '../services/queue';
import { sendWhatsAppMessage } from '../services/whatsapp';
import { logger } from '../lib/logger';

export interface OutboundMessageJobData {
  tenantId: string;
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
  channel: 'whatsapp';
}

export function startMessageWorker(): Worker<OutboundMessageJobData> {
  const worker = new Worker<OutboundMessageJobData>(
    'outbound-message',
    async (job: Job<OutboundMessageJobData>) => {
      const { phoneNumberId, accessToken, to, text, tenantId } = job.data;

      logger.info({ tenantId, to, channel: job.data.channel }, 'Sending outbound message');

      const result = await sendWhatsAppMessage(phoneNumberId, accessToken, to, text);

      logger.info({ tenantId, to, result }, 'Outbound message sent');
      return result;
    },
    {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 100,
      },
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, tenantId: job?.data?.tenantId, to: job?.data?.to, err },
      'Outbound message job failed'
    );
  });

  return worker;
}
