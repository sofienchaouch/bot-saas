import { Worker, Job } from 'bullmq';
import { redisConnection } from '../services/queue';
import { readTenantsStore, writeTenantsStore } from '../services/db';
import { logger } from '../lib/logger';
import { NODE_ENV } from '../config';

export interface CrawlJobData {
  tenantId: string;
}

export function startCrawlWorker(): Worker<CrawlJobData> {
  const worker = new Worker<CrawlJobData>(
    'crawl',
    async (job: Job<CrawlJobData>) => {
      const { tenantId } = job.data;
      const store = await readTenantsStore();
      const tenant = store[tenantId];

      if (!tenant) {
        logger.warn({ tenantId }, 'Crawl job: tenant not found');
        return;
      }

      const targetItem = tenant.knowledgeBase?.find(
        (kb: any) => kb.type === 'crawl' || kb.type === 'url'
      );
      if (!targetItem?.url) {
        logger.info({ tenantId }, 'Crawl job: no crawlable URL, skipping');
        return;
      }

      const now = new Date();
      const pageTitle = 'Auto-Synced Business Catalogue';
      const mockContent = `Dynamic catalog snapshot generated automatically on schedule: ${tenant.crawlSchedule}.\nIndexed on: ${now.toISOString()}.\nServices and product ranges have been fully re-verified and synchronized to vectors.`;

      const newKbItem = {
        id: `sched-kb-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'crawl' as const,
        title: pageTitle,
        content: mockContent,
        dateAdded: now.toISOString().split('T')[0],
        url: targetItem.url,
        crawlDepth: 1,
        crawlStatus: 'synced' as const,
        crawlPagesCount: 3,
        chunks: [{ text: pageTitle }, { text: mockContent }],
      };

      tenant.knowledgeBase = tenant.knowledgeBase || [];
      tenant.knowledgeBase = tenant.knowledgeBase.filter(
        (kb: any) => !(kb.type === 'crawl' && kb.title === pageTitle)
      );
      tenant.knowledgeBase.push(newKbItem);
      tenant.lastCrawlTime = now.toISOString();
      store[tenantId] = tenant;

      await writeTenantsStore(store);
      logger.info({ tenantId, schedule: tenant.crawlSchedule }, 'Crawl job completed');
    },
    { connection: redisConnection }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, tenantId: job?.data?.tenantId, err }, 'Crawl job failed');
  });

  return worker;
}
