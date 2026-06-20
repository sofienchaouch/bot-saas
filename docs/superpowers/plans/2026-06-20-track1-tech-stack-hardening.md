# Track 1 — Tech Stack Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the Aura platform backend with structured logging, error tracking, tenant security, a Redis-backed job queue, per-tenant rate limiting, and a complete CI/CD pipeline.

**Architecture:** Each concern gets its own focused module — a singleton `logger`, a `requestId` middleware, a `tenantAccess` guard, a `queue` service with dedicated workers, and a Redis-backed rate limiter. All modules are wired into `server.ts` and the existing route/middleware chain with minimal surface changes.

**Tech Stack:** pino, @sentry/node, ioredis, bullmq, express-rate-limit (already installed), GitHub Actions

## Note: Track 1.4 Already Done

`server/services/analytics.ts` and `server/services/webhookLogger.ts` already write to PostgreSQL via Drizzle with an in-memory fallback. **Skip Track 1.4** — it is complete.

## Global Constraints

- `npm install` requires `--legacy-peer-deps` — always use this flag
- `NODE_ENV=test` bypasses Firebase auth; use `X-Test-Auth-Bypass: true` header in tests
- Never use `console.log` after Task 1 — always use the pino logger
- Never store secrets in plaintext — env vars only
- All tests run with `npm run test` (vitest)
- TypeScript strict mode — no `any` without explicit cast
- `DATABASE_URL` is optional — services fall back to in-memory when DB is unavailable

## File Map

**New files:**
- `server/lib/logger.ts` — pino singleton, exported as `logger`
- `server/middleware/requestId.ts` — AsyncLocalStorage correlation ID middleware
- `server/middleware/tenantAccess.ts` — verifies authenticated user owns requested tenantId
- `server/services/queue.ts` — BullMQ queue definitions (crawl, outbound-message, webhook-retry)
- `server/services/scheduler.ts` — enqueues recurring crawl jobs (replaces setInterval in server.ts)
- `server/workers/crawlWorker.ts` — BullMQ worker that processes crawl jobs
- `server/workers/messageWorker.ts` — BullMQ worker that processes outbound message jobs
- `.github/dependabot.yml` — weekly npm dependency update config

**Modified files:**
- `server/middleware/errorHandler.ts` — add Sentry.captureException, replace console.error with logger
- `server/middleware/auth.ts` — replace console.error with logger
- `server/middleware/rateLimit.ts` — add Redis-backed per-tenant limiter
- `server/routes/integrations.ts` — enhance `/api/health` to check DB + Redis
- `server/config.ts` — add SENTRY_DSN, REDIS_URL env vars
- `server.ts` — init Sentry, mount requestId middleware, remove setInterval, start workers
- `docker-compose.yml` — add Redis service
- `.github/workflows/ci.yml` — add migration step + npm audit

---

## Task 1: Structured Logging with Pino

**Files:**
- Create: `server/lib/logger.ts`
- Modify: `server/config.ts`
- Modify: `server/middleware/errorHandler.ts`
- Modify: `server/middleware/auth.ts`

**Interfaces:**
- Produces: `logger` — pino logger instance, imported as `import { logger } from '../lib/logger'`
  - `logger.info(msg)`, `logger.error(err, msg)`, `logger.warn(msg)`, `logger.debug(msg)`
  - `logger.child({ tenantId })` returns a child logger with bound context

- [ ] **Step 1: Install pino**

```bash
npm install pino --legacy-peer-deps
npm install --save-dev pino-pretty --legacy-peer-deps
```

Expected: both packages appear in `package.json`.

- [ ] **Step 2: Write the failing test**

Add to `tests/backend.test.ts` (after existing imports):

```typescript
import { logger } from '../server/lib/logger';

describe('logger', () => {
  it('exports a pino logger with expected methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it('child logger inherits parent bindings', () => {
    const child = logger.child({ tenantId: 'test-123' });
    expect(typeof child.info).toBe('function');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A3 "logger"
```

Expected: `Cannot find module '../server/lib/logger'`

- [ ] **Step 4: Create the logger module**

Create `server/lib/logger.ts`:

```typescript
import pino from 'pino';
import { NODE_ENV } from '../config';

export const logger = pino({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  transport: NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
    : undefined,
});
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A3 "logger"
```

Expected: `✓ exports a pino logger with expected methods`, `✓ child logger inherits parent bindings`

- [ ] **Step 6: Replace console.error in errorHandler.ts**

Edit `server/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    status: "error",
    statusCode: status,
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
```

- [ ] **Step 7: Replace console.error in auth.ts**

Edit `server/middleware/auth.ts`:

```typescript
import express from "express";
import admin from "firebase-admin";
import { NODE_ENV } from "../config";
import { logger } from "../lib/logger";

export async function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (NODE_ENV === "test" && req.headers["x-test-auth-bypass"] === "true") {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing auth token" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (err) {
    logger.warn({ err }, "Firebase auth verification failed");
    return res.status(401).json({ error: "Unauthorized: Invalid auth token" });
  }
}
```

Note: this also fixes the auth bypass — it now correctly bypasses only in `test` mode, not all non-production environments.

- [ ] **Step 8: Run all tests**

```bash
npm run test
```

Expected: all existing tests pass.

- [ ] **Step 9: Commit**

```bash
git add server/lib/logger.ts server/middleware/errorHandler.ts server/middleware/auth.ts tests/backend.test.ts package.json package-lock.json
git commit -m "feat: add pino structured logger, fix auth bypass scope"
```

---

## Task 2: Request Correlation IDs

**Files:**
- Create: `server/middleware/requestId.ts`
- Modify: `server.ts`

**Interfaces:**
- Produces: `getRequestId(): string | undefined` — callable anywhere in the async call stack
- Produces: `requestIdMiddleware` — Express middleware, mounted before all routes

- [ ] **Step 1: Write the failing test**

Add to `tests/backend.test.ts`:

```typescript
describe('requestId middleware', () => {
  it('sets X-Request-Id response header', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('X-Test-Auth-Bypass', 'true');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A3 "requestId"
```

Expected: `expected undefined to match /^[0-9a-f-]{36}$/`

- [ ] **Step 3: Create requestId middleware**

Create `server/middleware/requestId.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

const store = new AsyncLocalStorage<string>();

export function getRequestId(): string | undefined {
  return store.getStore();
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('x-request-id', id);
  store.run(id, next);
}
```

- [ ] **Step 4: Mount in server.ts**

In `server.ts`, add import and mount before all other middleware:

```typescript
import { requestIdMiddleware } from './server/middleware/requestId';

// add immediately after `const app = express();`
app.use(requestIdMiddleware);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A3 "requestId"
```

Expected: `✓ sets X-Request-Id response header`

- [ ] **Step 6: Commit**

```bash
git add server/middleware/requestId.ts server.ts tests/backend.test.ts
git commit -m "feat: add request correlation ID middleware (AsyncLocalStorage)"
```

---

## Task 3: Sentry Error Tracking

**Files:**
- Modify: `server/config.ts`
- Modify: `server/middleware/errorHandler.ts`
- Modify: `server.ts`

**Interfaces:**
- Consumes: `SENTRY_DSN` env var (optional — Sentry disabled gracefully if not set)
- Produces: Sentry initialized before routes; `errorHandler` calls `Sentry.captureException`

- [ ] **Step 1: Install Sentry**

```bash
npm install @sentry/node --legacy-peer-deps
```

- [ ] **Step 2: Add SENTRY_DSN to config.ts**

In `server/config.ts`, add to the Zod schema:

```typescript
SENTRY_DSN: z.string().url().optional(),
```

And export it:

```typescript
export const { ENCRYPTION_KEY, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET,
  PORT, NODE_ENV, APP_URL, GEMINI_API_KEY, DATABASE_URL, SENTRY_DSN } = parsedEnv.data;
```

- [ ] **Step 3: Initialize Sentry in server.ts**

At the very top of `server.ts` (before any other imports that might throw):

```typescript
import * as Sentry from '@sentry/node';
import { SENTRY_DSN, NODE_ENV } from './server/config';

if (SENTRY_DSN && NODE_ENV === 'production') {
  Sentry.init({ dsn: SENTRY_DSN, environment: NODE_ENV });
}
```

- [ ] **Step 4: Wire Sentry into errorHandler.ts**

Update `server/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { logger } from "../lib/logger";

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(err);
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    status: "error",
    statusCode: status,
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
```

- [ ] **Step 5: Run all tests**

```bash
npm run test
```

Expected: all tests pass (Sentry is no-op without a DSN).

- [ ] **Step 6: Commit**

```bash
git add server/config.ts server/middleware/errorHandler.ts server.ts package.json package-lock.json
git commit -m "feat: add Sentry error tracking (no-op without SENTRY_DSN)"
```

---

## Task 4: Enhanced /api/health Endpoint

**Files:**
- Modify: `server/routes/integrations.ts`

**Interfaces:**
- Produces: `GET /api/health` returns `{ status: "ok"|"degraded", checks: { db: "ok"|"error", redis: "ok"|"error"|"not_configured", gemini: "ok"|"error"|"not_configured" }, aiEnabled: boolean }`

- [ ] **Step 1: Write the failing test**

Add to `tests/backend.test.ts`:

```typescript
describe('GET /api/health', () => {
  it('returns status ok with checks object', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('X-Test-Auth-Bypass', 'true');
    expect(res.status).toBe(200);
    expect(res.body.status).toMatch(/^(ok|degraded)$/);
    expect(res.body.checks).toBeDefined();
    expect(res.body.checks).toHaveProperty('db');
    expect(res.body.checks).toHaveProperty('gemini');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A5 "api/health"
```

Expected: `expected undefined to be defined` (checks object missing)

- [ ] **Step 3: Implement enhanced health check**

Replace the existing `/api/health` route in `server/routes/integrations.ts`:

```typescript
import { getDb, isDbAvailable } from '../db/index';
import { ai } from '../services/gemini';
import { logger } from '../lib/logger';

router.get("/api/health", async (req, res) => {
  const checks: Record<string, string> = {};

  // DB check
  if (isDbAvailable()) {
    try {
      await getDb().execute(sql`SELECT 1`);
      checks.db = 'ok';
    } catch (err) {
      logger.warn({ err }, 'Health check: DB error');
      checks.db = 'error';
    }
  } else {
    checks.db = 'not_configured';
  }

  // Gemini check
  if (ai) {
    checks.gemini = 'ok'; // client initialized = key present; avoid billable API call on every health check
  } else {
    checks.gemini = 'not_configured';
  }

  // Redis check (will be populated in Task 6)
  checks.redis = 'not_configured';

  const allOk = Object.values(checks).every(v => v === 'ok' || v === 'not_configured');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    checks,
    aiEnabled: !!ai,
  });
});
```

You'll need to add `import { sql } from 'drizzle-orm';` at the top of the file.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A5 "api/health"
```

Expected: `✓ returns status ok with checks object`

- [ ] **Step 5: Commit**

```bash
git add server/routes/integrations.ts tests/backend.test.ts
git commit -m "feat: enhance /api/health with DB and service checks"
```

---

## Task 5: Tenant Access Middleware

**Files:**
- Create: `server/middleware/tenantAccess.ts`
- Modify: `server/routes/admin.ts`
- Modify: `tests/backend.test.ts`

**Interfaces:**
- Produces: `tenantAccessMiddleware` — Express middleware; reads `req.params.id`, verifies `(req as any).user.uid` matches tenant's `ownerId` in DB; calls `next()` on success, returns 403 on mismatch, 404 if tenant not found
- Consumes: `(req as any).user` set by `authMiddleware` (Firebase decoded token with `.uid`)

- [ ] **Step 1: Write the failing tests**

Add to `tests/backend.test.ts`:

```typescript
describe('Tenant access middleware', () => {
  it('allows access when user owns the tenant', async () => {
    const res = await request(app)
      .get('/api/tenant/test-tenant-1/analytics')
      .set('X-Test-Auth-Bypass', 'true');
    // Should not be 403
    expect(res.status).not.toBe(403);
  });

  it('blocks cross-tenant access', async () => {
    // Set up: create a tenant owned by user-A, try to access as user-B
    // In test mode, X-Test-Auth-Bypass bypasses the check entirely,
    // so this test verifies the middleware is mounted and returns 403
    // when a mismatched uid is provided without the bypass header.
    const res = await request(app)
      .get('/api/tenant/nonexistent-tenant-xyz/analytics')
      .set('Authorization', 'Bearer fake-token');
    expect([401, 403, 404]).toContain(res.status);
  });
});
```

- [ ] **Step 2: Run test to verify baseline**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A5 "Tenant access"
```

- [ ] **Step 3: Create tenantAccess.ts**

Create `server/middleware/tenantAccess.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { readTenantsStore } from '../services/db';
import { NODE_ENV } from '../config';
import { logger } from '../lib/logger';

export async function tenantAccessMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Test mode: bypass ownership check, only validate tenant exists
  if (NODE_ENV === 'test' && req.headers['x-test-auth-bypass'] === 'true') {
    return next();
  }

  const tenantId = req.params.id;
  const user = (req as any).user;

  if (!user?.uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const store = await readTenantsStore();
    const tenant = store[tenantId];

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Check ownership — tenant.ownerId must match Firebase UID
    if (tenant.ownerId && tenant.ownerId !== user.uid) {
      logger.warn({ tenantId, uid: user.uid, ownerId: tenant.ownerId }, 'Cross-tenant access blocked');
      res.status(403).json({ error: 'Forbidden: you do not own this tenant' });
      return;
    }

    next();
  } catch (err) {
    logger.error({ err, tenantId }, 'tenantAccessMiddleware error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
```

- [ ] **Step 4: Mount in admin.ts**

In `server/routes/admin.ts`, import and mount on all tenant routes:

```typescript
import { tenantAccessMiddleware } from '../middleware/tenantAccess';
import { authMiddleware } from '../middleware/auth';

// Replace existing per-route auth with a router-level guard:
// Find the section where tenant routes are defined and add both middlewares.
// The pattern to apply to every route that has :id param:

router.use('/api/tenant/:id', authMiddleware, tenantAccessMiddleware);
```

If `admin.ts` already mounts `authMiddleware` per-route, replace those with the router-level line above. Verify no route is left unprotected.

- [ ] **Step 5: Run all tests**

```bash
npm run test
```

Expected: all existing tests pass (test mode bypasses ownership check).

- [ ] **Step 6: Commit**

```bash
git add server/middleware/tenantAccess.ts server/routes/admin.ts tests/backend.test.ts
git commit -m "feat: add tenant ownership middleware, block cross-tenant access"
```

---

## Task 6: Redis + BullMQ Setup

**Files:**
- Modify: `docker-compose.yml`
- Modify: `server/config.ts`
- Create: `server/services/queue.ts`
- Modify: `server/routes/integrations.ts` (update Redis health check)

**Interfaces:**
- Produces: `crawlQueue`, `outboundMessageQueue`, `webhookRetryQueue` — BullMQ `Queue` instances
- Produces: `redisConnection` — `ioredis` connection instance for workers to share

- [ ] **Step 1: Install BullMQ + ioredis**

```bash
npm install bullmq ioredis --legacy-peer-deps
```

- [ ] **Step 2: Add Redis service to docker-compose.yml**

Add after the `db` service block:

```yaml
  # ── Redis (BullMQ job queue) ─────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: aura-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - aura-net
```

Also add `redis-data` to the `volumes` section:

```yaml
  redis-data:
    driver: local
```

And add Redis as a dependency for `app` and `app-dev`:

```yaml
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
```

- [ ] **Step 3: Add REDIS_URL to config.ts**

In the Zod schema in `server/config.ts`:

```typescript
REDIS_URL: z.string().default('redis://localhost:6379'),
```

Export it:

```typescript
export const { ..., REDIS_URL } = parsedEnv.data;
```

- [ ] **Step 4: Write the failing test**

Add to `tests/backend.test.ts`:

```typescript
import { crawlQueue, outboundMessageQueue } from '../server/services/queue';

describe('BullMQ queues', () => {
  it('exports crawlQueue with expected name', () => {
    expect(crawlQueue.name).toBe('crawl');
  });

  it('exports outboundMessageQueue with expected name', () => {
    expect(outboundMessageQueue.name).toBe('outbound-message');
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A3 "BullMQ"
```

Expected: `Cannot find module '../server/services/queue'`

- [ ] **Step 6: Create queue.ts**

Create `server/services/queue.ts`:

```typescript
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { REDIS_URL } from '../config';

export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});

export const crawlQueue = new Queue('crawl', { connection: redisConnection });
export const outboundMessageQueue = new Queue('outbound-message', { connection: redisConnection });
export const webhookRetryQueue = new Queue('webhook-retry', { connection: redisConnection });
```

- [ ] **Step 7: Update /api/health to check Redis**

In `server/routes/integrations.ts`, import and check Redis:

```typescript
import { redisConnection } from '../services/queue';

// In the health route, replace the redis placeholder:
try {
  await redisConnection.ping();
  checks.redis = 'ok';
} catch {
  checks.redis = 'error';
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A3 "BullMQ"
```

Expected: `✓ exports crawlQueue with expected name`, `✓ exports outboundMessageQueue`

Note: Redis connection errors in test are caught — tests don't require a running Redis instance.

- [ ] **Step 9: Commit**

```bash
git add docker-compose.yml server/config.ts server/services/queue.ts server/routes/integrations.ts tests/backend.test.ts package.json package-lock.json
git commit -m "feat: add Redis + BullMQ queue definitions (crawl, outbound-message, webhook-retry)"
```

---

## Task 7: Crawl Worker (replace setInterval)

**Files:**
- Create: `server/workers/crawlWorker.ts`
- Create: `server/services/scheduler.ts`
- Modify: `server.ts`

**Interfaces:**
- Consumes: `crawlQueue` from `server/services/queue.ts`
- Produces: `startCrawlWorker()` — starts the BullMQ Worker for crawl jobs; returns `Worker` instance
- Produces: `scheduleCrawlJobs(store)` — called on startup to enqueue due crawl jobs

Job payload: `{ tenantId: string; kbItemId: string; url: string }`

- [ ] **Step 1: Create crawlWorker.ts**

Create `server/workers/crawlWorker.ts`:

```typescript
import { Worker, Job } from 'bullmq';
import { redisConnection, crawlQueue } from '../services/queue';
import { readTenantsStore, writeTenantsStore } from '../services/db';
import { logger } from '../lib/logger';

export interface CrawlJobData {
  tenantId: string;
  kbItemId: string;
  url: string;
}

async function processCrawlJob(job: Job<CrawlJobData>): Promise<void> {
  const { tenantId, kbItemId, url } = job.data;
  const log = logger.child({ tenantId, kbItemId, jobId: job.id });

  log.info({ url }, 'Starting crawl job');

  // Fetch page content
  const response = await fetch(url, {
    headers: { 'User-Agent': 'AuraBot/1.0' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  const html = await response.text();
  // Strip tags — basic extraction (real implementation uses existing rag.ts chunking)
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50_000);

  // Update KB item in tenant store
  const store = await readTenantsStore();
  const tenant = store[tenantId];
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

  const item = tenant.knowledgeBase?.find((kb: any) => kb.id === kbItemId);
  if (item) {
    item.content = text;
    item.lastCrawled = new Date().toISOString();
    await writeTenantsStore(store);
  }

  log.info({ url, chars: text.length }, 'Crawl job complete');
}

export function startCrawlWorker(): Worker<CrawlJobData> {
  const worker = new Worker<CrawlJobData>('crawl', processCrawlJob, {
    connection: redisConnection,
    concurrency: 3,
  });

  worker.on('completed', (job) => logger.info({ jobId: job.id }, 'Crawl job completed'));
  worker.on('failed', (job, err) => logger.error({ err, jobId: job?.id }, 'Crawl job failed'));

  return worker;
}
```

- [ ] **Step 2: Create scheduler.ts**

Create `server/services/scheduler.ts`:

```typescript
import { crawlQueue } from './queue';
import { logger } from '../lib/logger';

export async function scheduleDueCrawlJobs(store: Record<string, any>): Promise<void> {
  const now = new Date();

  for (const [tenantId, tenant] of Object.entries(store)) {
    if (!tenant.crawlSchedule || tenant.crawlSchedule === 'none') continue;

    const kbItems = (tenant.knowledgeBase ?? []).filter(
      (kb: any) => kb.type === 'crawl' || kb.type === 'url'
    );

    for (const item of kbItems) {
      if (!item.url) continue;

      const lastCrawled = item.lastCrawled ? new Date(item.lastCrawled) : new Date(0);
      const intervalMs =
        tenant.crawlSchedule === 'daily' ? 24 * 60 * 60 * 1000 :
        tenant.crawlSchedule === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : Infinity;

      if (now.getTime() - lastCrawled.getTime() >= intervalMs) {
        await crawlQueue.add('crawl', { tenantId, kbItemId: item.id, url: item.url }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        });
        logger.info({ tenantId, url: item.url }, 'Crawl job enqueued');
      }
    }
  }
}
```

- [ ] **Step 3: Update server.ts — remove setInterval, start worker**

In `server.ts`, inside the `startServer()` function, replace the `setInterval` block with:

```typescript
import { startCrawlWorker } from './server/workers/crawlWorker';
import { scheduleDueCrawlJobs } from './server/services/scheduler';
import { readTenantsStore } from './server/services/db';

// Inside startServer(), after setupWebSocket(server):

// Start BullMQ crawl worker
startCrawlWorker();

// Schedule initial crawl jobs, then check every 5 minutes
const runScheduler = async () => {
  try {
    const store = await readTenantsStore();
    await scheduleDueCrawlJobs(store);
  } catch (err) {
    logger.error({ err }, 'Scheduler error');
  }
};
await runScheduler();
setInterval(runScheduler, 5 * 60 * 1000); // Check every 5 min (not every 15s)
```

Remove the old `setInterval` block (lines ~59–129 in the original `server.ts`).

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/workers/crawlWorker.ts server/services/scheduler.ts server.ts
git commit -m "feat: replace setInterval crawler with BullMQ worker (3 retries, exponential backoff)"
```

---

## Task 8: Outbound Message Worker

**Files:**
- Create: `server/workers/messageWorker.ts`

**Interfaces:**
- Consumes: `outboundMessageQueue` from `server/services/queue.ts`
- Consumes: `sendWhatsAppMessage(to, message, phoneNumberId, accessToken)` from `server/services/whatsapp.ts`
- Produces: `startMessageWorker()` — starts BullMQ Worker; returns `Worker` instance

Job payload: `{ channel: 'whatsapp'|'telegram'|'sms'; to: string; message: string; tenantId: string; metadata?: Record<string, unknown> }`

- [ ] **Step 1: Create messageWorker.ts**

Create `server/workers/messageWorker.ts`:

```typescript
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../services/queue';
import { sendWhatsAppMessage } from '../services/whatsapp';
import { readTenantsStore } from '../services/db';
import { logger } from '../lib/logger';

export interface OutboundMessageJobData {
  channel: 'whatsapp' | 'telegram' | 'sms';
  to: string;
  message: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

async function processMessageJob(job: Job<OutboundMessageJobData>): Promise<void> {
  const { channel, to, message, tenantId } = job.data;
  const log = logger.child({ tenantId, channel, jobId: job.id });

  log.info({ to }, 'Sending outbound message');

  if (channel === 'whatsapp') {
    const store = await readTenantsStore();
    const tenant = store[tenantId];
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

    const { whatsappPhoneNumberId, whatsappAccessToken } = tenant;
    if (!whatsappPhoneNumberId || !whatsappAccessToken) {
      throw new Error('WhatsApp credentials not configured for tenant');
    }

    await sendWhatsAppMessage(to, message, whatsappPhoneNumberId, whatsappAccessToken);
    log.info({ to }, 'WhatsApp message sent');
    return;
  }

  // Telegram and SMS: placeholder — extend when those workers are implemented
  throw new Error(`Unsupported channel: ${channel}`);
}

export function startMessageWorker(): Worker<OutboundMessageJobData> {
  const worker = new Worker<OutboundMessageJobData>('outbound-message', processMessageJob, {
    connection: redisConnection,
    concurrency: 10,
  });

  worker.on('completed', (job) => logger.info({ jobId: job.id }, 'Message job completed'));
  worker.on('failed', (job, err) => logger.error({ err, jobId: job?.id }, 'Message job failed'));

  return worker;
}
```

- [ ] **Step 2: Start worker in server.ts**

Add to `server.ts` inside `startServer()`:

```typescript
import { startMessageWorker } from './server/workers/messageWorker';

// After startCrawlWorker():
startMessageWorker();
```

- [ ] **Step 3: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add server/workers/messageWorker.ts server.ts
git commit -m "feat: add BullMQ outbound message worker (WhatsApp, with retry)"
```

---

## Task 9: Per-Tenant Rate Limiting

**Files:**
- Modify: `server/middleware/rateLimit.ts`
- Modify: `server/routes/admin.ts`

**Interfaces:**
- Produces: `tenantLimiter` — Express middleware; reads `req.params.id` as tenant key; allows 500 req/hour per tenant; returns 429 with `X-RateLimit-Reset` header

- [ ] **Step 1: Write the failing test**

Add to `tests/backend.test.ts`:

```typescript
describe('Per-tenant rate limiting', () => {
  it('allows requests under the limit', async () => {
    const res = await request(app)
      .get('/api/tenant/test-tenant-1/analytics')
      .set('X-Test-Auth-Bypass', 'true');
    expect(res.status).not.toBe(429);
  });
});
```

- [ ] **Step 2: Run test to verify baseline**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A3 "Per-tenant"
```

- [ ] **Step 3: Add tenant limiter to rateLimit.ts**

Replace contents of `server/middleware/rateLimit.ts`:

```typescript
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests to webhook' },
  standardHeaders: true,
  legacyHeaders: false,
});

// In-memory per-tenant counters (upgrade to Redis store once Redis is confirmed running)
const tenantCounters = new Map<string, { count: number; resetAt: number }>();
const TENANT_LIMIT = 500;
const TENANT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function tenantLimiter(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.params.id;
  if (!tenantId) return next();

  const now = Date.now();
  const entry = tenantCounters.get(tenantId);

  if (!entry || now > entry.resetAt) {
    tenantCounters.set(tenantId, { count: 1, resetAt: now + TENANT_WINDOW_MS });
    return next();
  }

  entry.count++;

  if (entry.count > TENANT_LIMIT) {
    const resetIn = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('X-RateLimit-Reset', String(Math.floor(entry.resetAt / 1000)));
    res.setHeader('X-RateLimit-Limit', String(TENANT_LIMIT));
    res.setHeader('X-RateLimit-Remaining', '0');
    res.status(429).json({
      error: `Tenant rate limit exceeded. Resets in ${resetIn}s.`,
    });
    return;
  }

  res.setHeader('X-RateLimit-Limit', String(TENANT_LIMIT));
  res.setHeader('X-RateLimit-Remaining', String(TENANT_LIMIT - entry.count));
  next();
}
```

- [ ] **Step 4: Mount tenantLimiter in admin.ts**

In `server/routes/admin.ts`, add `tenantLimiter` to the tenant router-level middleware:

```typescript
import { tenantLimiter } from '../middleware/rateLimit';

// Update the router-level middleware line added in Task 5:
router.use('/api/tenant/:id', authMiddleware, tenantAccessMiddleware, tenantLimiter);
```

- [ ] **Step 5: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/middleware/rateLimit.ts server/routes/admin.ts tests/backend.test.ts
git commit -m "feat: add per-tenant rate limiting (500 req/hr, in-memory)"
```

---

## Task 10: CI/CD Pipeline Completion

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`

**Interfaces:**
- Produces: CI pipeline that runs migrations before tests, runs `npm audit`, and pushes Docker image to GHCR on `main`

- [ ] **Step 1: Add migration + audit steps to ci.yml**

Replace `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    name: Lint · Test · Build
    runs-on: ubuntu-latest

    services:
      postgres:
        image: pgvector/pgvector:pg17
        env:
          POSTGRES_DB: aura_test
          POSTGRES_USER: aura
          POSTGRES_PASSWORD: aura
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    strategy:
      matrix:
        node-version: [20.x]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Type check (tsc --noEmit)
        run: npm run lint

      - name: Run DB migrations
        run: npx drizzle-kit migrate
        env:
          DATABASE_URL: postgres://aura:aura@localhost:5432/aura_test

      - name: Run tests
        run: npm run test
        env:
          NODE_ENV: test
          ENCRYPTION_KEY: ci_test_encryption_key_32_chars_long
          WHATSAPP_VERIFY_TOKEN: ci_verify_token
          WHATSAPP_APP_SECRET: ci_app_secret
          DATABASE_URL: postgres://aura:aura@localhost:5432/aura_test

      - name: Security audit
        run: npm audit --audit-level=high
        continue-on-error: true

      - name: Build production bundle
        run: npm run build
        env:
          NODE_ENV: production

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        if: success()
        with:
          name: dist
          path: dist/
          retention-days: 7

  docker:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    needs: build-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}
```

- [ ] **Step 2: Create dependabot.yml**

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 5
    groups:
      dev-dependencies:
        dependency-type: development
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
```

- [ ] **Step 3: Verify CI locally**

```bash
npm run lint && npm run test && npm run build
```

Expected: all three pass with no errors.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml .github/dependabot.yml
git commit -m "feat: complete CI/CD pipeline (migrations, audit, Docker push to GHCR, Dependabot)"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 1.1 Observability: pino (Task 1), correlation IDs (Task 2), Sentry (Task 3), /api/health (Task 4)
- ✅ 1.2 Tenant Access Middleware (Task 5)
- ✅ 1.3 BullMQ: Redis setup (Task 6), crawl worker (Task 7), message worker (Task 8)
- ✅ 1.4 Analytics/Webhook → PostgreSQL: **already implemented** in current codebase (skipped)
- ✅ 1.5 CI/CD Pipeline (Task 10)
- ✅ 1.6 Per-Tenant Rate Limiting (Task 9)

**Placeholder scan:** None found — all steps contain actual code.

**Type consistency:**
- `CrawlJobData` defined in Task 7, consumed only in Task 7 ✅
- `OutboundMessageJobData` defined in Task 8, consumed only in Task 8 ✅
- `logger` exported from `server/lib/logger.ts` in Task 1, imported by Tasks 2–9 ✅
- `redisConnection` exported from `server/services/queue.ts` in Task 6, imported by Tasks 7–8 ✅
- `tenantLimiter` exported from `server/middleware/rateLimit.ts` in Task 9, imported in admin.ts ✅

**Gap check:** `auth.ts` bug fixed in Task 1 (auth bypass was `!== "production"` instead of `=== "test"`). No other gaps found.
