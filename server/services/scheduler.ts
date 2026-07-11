import { crawlQueue } from './queue';
import { readTenantsStore, resetTenantQuota } from './db';
import { logger } from '../lib/logger';
import { NODE_ENV } from '../config';

const BILLING_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;

let schedulerInterval: NodeJS.Timeout | null = null;

async function resetElapsedBillingCycles(): Promise<void> {
  try {
    const store = await readTenantsStore();
    const now = new Date();

    for (const tenantId of Object.keys(store)) {
      const tenant = store[tenantId];
      const anchor = tenant.billingCycleAnchor ? new Date(tenant.billingCycleAnchor) : null;
      if (!anchor) continue;

      if (now.getTime() - anchor.getTime() >= BILLING_CYCLE_MS) {
        await resetTenantQuota(tenantId);
        logger.info({ tenantId }, 'Monthly message quota reset');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Scheduler: error during resetElapsedBillingCycles');
  }
}

async function schedulePendingCrawls(): Promise<void> {
  try {
    const store = await readTenantsStore();
    const now = new Date();

    for (const tenantId of Object.keys(store)) {
      const tenant = store[tenantId];
      if (!tenant.crawlSchedule || tenant.crawlSchedule === 'none') continue;

      const isDev = NODE_ENV !== 'production';
      const intervalMs =
        tenant.crawlSchedule === 'daily'
          ? isDev
            ? 2 * 60 * 1000
            : 24 * 60 * 60 * 1000
          : isDev
            ? 5 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000;

      const lastCrawl = tenant.lastCrawlTime ? new Date(tenant.lastCrawlTime) : new Date(0);
      if (now.getTime() - lastCrawl.getTime() >= intervalMs) {
        await crawlQueue.add(
          'scheduled-crawl',
          { tenantId },
          {
            jobId: `crawl-${tenantId}-${now.getTime()}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 50,
          }
        );
        logger.info({ tenantId, schedule: tenant.crawlSchedule }, 'Scheduled crawl job enqueued');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Scheduler: error during schedulePendingCrawls');
  }
}

export function startScheduler(): void {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(() => {
    void schedulePendingCrawls();
    void resetElapsedBillingCycles();
  }, 15000);
  logger.info('Crawl scheduler started (15s interval)');
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
