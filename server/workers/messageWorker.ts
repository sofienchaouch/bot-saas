import { Worker, Job, UnrecoverableError } from 'bullmq';
import { redisConnection } from '../services/queue';
import { sendWhatsAppMessage, isPlaceholderToken } from '../services/whatsapp';
import { readTenantsStore } from '../services/db';
import { logger } from '../lib/logger';

export interface OutboundMessageJobData {
  tenantId: string;
  to: string;
  text: string;
  channel: 'whatsapp';
}

// Job data intentionally carries only a tenantId, not credentials — the
// worker fetches (and decrypts) the WhatsApp token from the DB at process
// time so no plaintext access token ever passes through Redis.
export async function processOutboundMessage(data: OutboundMessageJobData) {
  const { tenantId, to, text } = data;

  const store = await readTenantsStore();
  const tenant = store[tenantId];
  if (!tenant) {
    throw new UnrecoverableError(`Tenant not found: ${tenantId}`);
  }

  const phoneNumberId = tenant.whatsAppVerifiedSid;
  const accessToken = tenant.whatsAppApiKey || process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !accessToken || isPlaceholderToken(accessToken)) {
    logger.info({ tenantId, to }, 'Skipping outbound message: placeholder or missing WhatsApp credentials');
    return { skipped: true };
  }

  logger.info({ tenantId, to }, 'Sending outbound message');
  const result = await sendWhatsAppMessage(phoneNumberId, accessToken, to, text);
  logger.info({ tenantId, to, result }, 'Outbound message sent');
  return result;
}

export function startMessageWorker(): Worker<OutboundMessageJobData> {
  const worker = new Worker<OutboundMessageJobData>(
    'outbound-message',
    async (job: Job<OutboundMessageJobData>) => processOutboundMessage(job.data),
    {
      connection: redisConnection,
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
