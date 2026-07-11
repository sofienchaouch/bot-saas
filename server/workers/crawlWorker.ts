import { Worker, Job } from 'bullmq';
import { redisConnection } from '../services/queue';
import { readTenantsStore, writeTenantsStore } from '../services/db';
import { validateUrlForSsrf, crawlWebsite } from '../services/crawler';
import { deleteChunksForDocument, enrichTenantEmbeddings } from '../services/rag';
import { logger } from '../lib/logger';

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

      const documentId = `sched-kb-${tenantId}`;
      const now = new Date();

      const isUrlSafe = await validateUrlForSsrf(targetItem.url);
      if (!isUrlSafe) {
        logger.warn({ tenantId, url: targetItem.url }, 'Crawl job: SSRF check failed for scheduled URL');
        tenant.knowledgeBase = tenant.knowledgeBase.filter((kb: any) => kb.id !== documentId);
        tenant.knowledgeBase.push({
          id: documentId,
          type: 'crawl' as const,
          title: 'Auto-Synced Business Catalogue',
          content: '',
          dateAdded: now.toISOString().split('T')[0],
          url: targetItem.url,
          crawlDepth: targetItem.crawlDepth ?? 1,
          crawlStatus: 'error' as const,
          crawlPagesCount: 0,
        });
        store[tenantId] = tenant;
        await writeTenantsStore(store);
        return;
      }

      try {
        const result = await crawlWebsite(targetItem.url, {
          maxDepth: targetItem.crawlDepth ?? 1,
          maxPages: 10,
        });

        tenant.knowledgeBase = tenant.knowledgeBase.filter((kb: any) => kb.id !== documentId);
        tenant.knowledgeBase.push({
          id: documentId,
          type: 'crawl' as const,
          title: result.title,
          content: result.content,
          dateAdded: now.toISOString().split('T')[0],
          url: targetItem.url,
          crawlDepth: targetItem.crawlDepth ?? 1,
          crawlStatus: 'synced' as const,
          crawlPagesCount: result.pagesCount,
        });
        tenant.lastCrawlTime = now.toISOString();
        store[tenantId] = tenant;

        // Re-embed: drop old chunks for this stable document id, then re-chunk/embed.
        await deleteChunksForDocument(documentId, tenantId);
        await enrichTenantEmbeddings(tenant);

        await writeTenantsStore(store);
        logger.info({ tenantId, schedule: tenant.crawlSchedule, pagesCount: result.pagesCount }, 'Crawl job completed');
      } catch (err) {
        tenant.knowledgeBase = tenant.knowledgeBase.filter((kb: any) => kb.id !== documentId);
        tenant.knowledgeBase.push({
          id: documentId,
          type: 'crawl' as const,
          title: 'Auto-Synced Business Catalogue',
          content: '',
          dateAdded: now.toISOString().split('T')[0],
          url: targetItem.url,
          crawlDepth: targetItem.crawlDepth ?? 1,
          crawlStatus: 'error' as const,
          crawlPagesCount: 0,
        });
        store[tenantId] = tenant;
        await writeTenantsStore(store);
        throw err; // let BullMQ's retry/backoff apply
      }
    },
    { connection: redisConnection }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, tenantId: job?.data?.tenantId, err }, 'Crawl job failed');
  });

  return worker;
}
