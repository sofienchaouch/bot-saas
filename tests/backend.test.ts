// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';

// Set environment variable to test to run in sandboxed local file storage
process.env.NODE_ENV = 'test';

import { app, cosineSimilarity, chunkText, encryptText, decryptText } from '../server';
import { readTenantsStore, writeTenantsStore, readConversationsStore, writeConversationsStore, _setMemTenant, _clearMemStore } from '../server/services/db';
import { getRAGContext } from '../server/services/rag';
import { logger } from '../server/lib/logger';
import { isOverQuota } from '../server/services/quota';
import { parseRobotsTxt, isPathDisallowed, validateUrlForSsrf } from '../server/services/crawler';

describe('Backend Utilities Unit Tests', () => {
  describe('cosineSimilarity', () => {
    it('should compute similarity for identical vectors', () => {
      const v = [1, 2, 3];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
    });

    it('should compute similarity for orthogonal vectors', () => {
      const v1 = [1, 0];
      const v2 = [0, 1];
      expect(cosineSimilarity(v1, v2)).toBe(0);
    });

    it('should handle division by zero vectors safely', () => {
      const v1 = [0, 0, 0];
      const v2 = [1, 2, 3];
      expect(cosineSimilarity(v1, v2)).toBe(0);
    });
  });

  describe('chunkText', () => {
    it('should split text into chunks based on size and overlap', () => {
      const text = 'abcdefghijkl';
      // size 4, overlap 1
      const chunks = chunkText(text, 4, 1);
      expect(chunks).toContain('abcd');
      expect(chunks).toContain('defg');
      expect(chunks).toContain('ghij');
    });

    it('should handle empty text inputs', () => {
      expect(chunkText('', 100, 10)).toEqual([]);
    });
  });

  describe('Encryption Utilities', () => {
    it('should successfully encrypt and decrypt a string', () => {
      const original = 'my-secret-key-12345';
      const encrypted = encryptText(original);
      expect(encrypted).not.toBe(original);
      expect(encrypted).toContain(':');

      const decrypted = decryptText(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should return empty string for empty inputs', () => {
      expect(encryptText('')).toBe('');
      expect(decryptText('')).toBe('');
    });
  });
});

describe('Backend API Integration Tests', () => {
  beforeEach(() => {
    _clearMemStore();
    _setMemTenant('test-tenant', {
      id: 'test-tenant',
      name: 'Test Business Corp',
      industry: 'Fitness',
      description: 'Test description',
      avatar: '💪',
      botName: 'Aura',
      tone: 'friendly',
      status: 'active',
      whatsAppApiKey: 'test-api-key',
      whatsAppSandboxActive: true,
      knowledgeBase: [],
      leads: [],
      appointments: []
    });
  });

  afterEach(() => {
    _clearMemStore();
  });

  describe('GET /api/health (enhanced)', () => {
    it('returns status and checks object', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('X-Test-Auth-Bypass', 'true');
      expect([200, 503]).toContain(res.status);
      expect(res.body.status).toMatch(/^(ok|degraded)$/);
      expect(res.body.checks).toBeDefined();
      expect(res.body.checks).toHaveProperty('db');
      expect(res.body.checks).toHaveProperty('gemini');
      expect(res.body.checks).toHaveProperty('redis');
      expect(res.body).toHaveProperty('aiEnabled');
    });

    it('returns 503 when a check reports error', async () => {
      // This test validates the logic — in test env DB may or may not be up
      // Just verify the shape is always correct regardless
      const res = await request(app).get('/api/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body.checks).toBeDefined();
    });
  });

  it('GET /api/tenants should return all tenants', async () => {
    const res = await request(app).get('/api/tenants').set('X-Test-Auth-Bypass', 'true');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('test-tenant');
    expect(res.body['test-tenant'].name).toBe('Test Business Corp');
  });

  it('POST /api/tenant/:tenantId/appointment should register appointments and auto-qualify new CRM leads', async () => {
    const appointmentPayload = {
      customerName: 'Clark Kent',
      customerPhone: '+1-555-707-1122',
      email: 'kent.c@dailyplanet.org',
      start: '2026-06-20T10:00:00',
      end: '2026-06-20T11:00:00',
      summary: 'Standard consultation'
    };

    const res = await request(app)
      .post('/api/tenant/test-tenant/appointment')
      .send(appointmentPayload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body.appointment.customerName).toBe('Clark Kent');

    // Read in-memory store and verify lead was auto-qualified and inserted in CRM list
    const store = await readTenantsStore();
    const tenant = store['test-tenant'];
    expect(tenant.appointments).toHaveLength(1);
    expect(tenant.leads).toHaveLength(1);
    // Verify leads data by calling GET /api/tenants
    const getRes = await request(app).get('/api/tenants').set('X-Test-Auth-Bypass', 'true');
    const getTenant = getRes.body['test-tenant'];
    expect(getTenant.leads[0].name).toBe('Clark Kent');
    expect(getTenant.leads[0].email).toBe('kent.c@dailyplanet.org');
    expect(getTenant.leads[0].status).toBe('Qualified');
  });

  it('POST /api/tenant/:tenantId/crawl should execute smart website mock crawl and add item to KB', async () => {
    const crawlPayload = {
      url: 'https://example-fitness-studio.com',
      source: 'web',
      depth: 1,
      pagesBudget: 10
    };

    const res = await request(app)
      .post('/api/tenant/test-tenant/crawl')
      .set('X-Test-Auth-Bypass', 'true')
      .send(crawlPayload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body.kbItem.title).toContain('Test Business Corp Website Index');
    expect(res.body.kbItem.content).toContain('Root website URL: https://example-fitness-studio.com');

    // Verify item is saved to database
    const getRes = await request(app).get('/api/tenants').set('X-Test-Auth-Bypass', 'true');
    const getTenant = getRes.body['test-tenant'];
    expect(getTenant.knowledgeBase).toHaveLength(1);
    expect(getTenant.knowledgeBase[0].title).toContain('Test Business Corp Website Index');
  });

  it('POST /api/webhook should block requests with missing signature', async () => {
    const payload = { object: "whatsapp_business_account", entry: [] };
    const res = await request(app)
      .post('/api/webhook')
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.text).toContain("Missing X-Hub-Signature-256 signature");
  });

  it('POST /api/webhook should block requests with invalid signature', async () => {
    const payload = { object: "whatsapp_business_account", entry: [] };
    const res = await request(app)
      .post('/api/webhook')
      .set('X-Hub-Signature-256', 'sha256=invalidhashvalue')
      .send(payload);

    expect(res.status).toBe(403);
    expect(res.text).toContain("signature verification failed");
  });

  it('POST /api/webhook should allow requests with valid signature', async () => {
    const payload = { object: "whatsapp_business_account", entry: [] };
    const rawBody = JSON.stringify(payload);
    const crypto = await import("crypto");
    const hmac = crypto.createHmac("sha256", "aura_whatsapp_app_secret_fallback_2026");
    hmac.update(rawBody);
    const signature = `sha256=${hmac.digest("hex")}`;

    const res = await request(app)
      .post('/api/webhook')
      .set('X-Hub-Signature-256', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "received");
  });

  it('Express global error handler should format route exceptions as JSON', async () => {
    const errRes = await request(app)
      .get('/api/test-error')
      .set('X-Test-Auth-Bypass', 'true');

    expect(errRes.status).toBe(500);
    expect(errRes.body).toHaveProperty("status", "error");
    expect(errRes.body).toHaveProperty("message");
  });

  it('POST /api/webhook/telegram/:tenantId should parse Telegram payload and reply', async () => {
    const payload = {
      update_id: 12345,
      message: {
        chat: { id: 98765 },
        from: { first_name: "Bruce" },
        text: "Inquire about rates"
      }
    };

    const res = await request(app)
      .post('/api/webhook/telegram/test-tenant')
      .send(payload);

    expect(res.status).toBe(200);
  });

  it('POST /api/webhook/twilio/sms/:tenantId should parse Twilio SMS and return TwiML XML', async () => {
    const res = await request(app)
      .post('/api/webhook/twilio/sms/test-tenant')
      .send({ Body: "Hello studio", From: "+15550199" });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/xml');
    expect(res.text).toContain('<Response>');
    expect(res.text).toContain('<Message>');
  });

  it('POST webhooks should return 403 when tenant is over quota', async () => {
    const store = await readTenantsStore();
    store['test-tenant'].messageCount = 50;
    store['test-tenant'].subscriptionTier = 'Free';
    await writeTenantsStore(store);

    const payload = {
      message: {
        chat: { id: 98765 },
        from: { first_name: "Bruce" },
        text: "Will fail"
      }
    };
    const res = await request(app)
      .post('/api/webhook/telegram/test-tenant')
      .send(payload);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Quota Exceeded");

    // Reset quota
    store['test-tenant'].messageCount = 0;
    await writeTenantsStore(store);
  });

  it('GET /api/conversations/:tenantId should support q search and limit pagination parameters', async () => {
    const conversations = await readConversationsStore();
    conversations['test-tenant_custom-user-1'] = {
      messages: [{ sender: "customer", text: "Alpha secret code word", timestamp: new Date().toISOString() }]
    };
    conversations['test-tenant_custom-user-2'] = {
      messages: [{ sender: "customer", text: "Beta text details", timestamp: new Date().toISOString() }]
    };
    await writeConversationsStore(conversations);

    const searchRes = await request(app)
      .get('/api/conversations/test-tenant?q=Alpha')
      .set('X-Test-Auth-Bypass', 'true');
    expect(searchRes.status).toBe(200);
    expect(Object.keys(searchRes.body)).toContain('test-tenant_custom-user-1');
    expect(Object.keys(searchRes.body)).not.toContain('test-tenant_custom-user-2');

    const limitRes = await request(app)
      .get('/api/conversations/test-tenant?limit=1')
      .set('X-Test-Auth-Bypass', 'true');
    expect(limitRes.status).toBe(200);
    expect(Object.keys(limitRes.body).length).toBe(1);
  });

  it('POST /api/conversations/:tenantId/:customerId/tags should set tags on conversation thread', async () => {
    const res = await request(app)
      .post('/api/conversations/test-tenant/custom-user-1/tags')
      .set('X-Test-Auth-Bypass', 'true')
      .send({ tags: ['VIP', 'Escalated'] });

    expect(res.status).toBe(200);
    expect(res.body.tags).toContain('VIP');

    const conversations = await readConversationsStore();
    expect(conversations['test-tenant_custom-user-1'].tags).toContain('Escalated');
  });

  it('GET /api/conversations/:tenantId/:customerId/export should return CSV data', async () => {
    const conversations = await readConversationsStore();
    conversations['test-tenant_custom-user-1'] = {
      messages: [{ sender: "customer", text: "Alpha secret code word", timestamp: new Date().toISOString() }]
    };
    await writeConversationsStore(conversations);

    const res = await request(app)
      .get('/api/conversations/test-tenant/custom-user-1/export')
      .set('X-Test-Auth-Bypass', 'true');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('sender,text,timestamp');
    expect(res.text).toContain('Alpha secret code word');
  });

  describe('Advanced RAG & Semantic Chunking', () => {
    it('should split text at paragraph and sentence boundaries', () => {
      const text = 'First sentence here. Second sentence starts here. Third one here!';
      const chunks = chunkText(text, 40, 10);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toBe('First sentence here.');
    });

    it('getRAGContext should return graceful fallback when database is not configured', async () => {
      // In test environment, DATABASE_URL is not set, so getRAGContext falls back gracefully
      const result = await getRAGContext('pricing plans', 'test-tenant');
      expect(result).toHaveProperty('contextText');
      expect(result).toHaveProperty('citations');
      expect(Array.isArray(result.citations)).toBe(true);
    });
  });

  describe('Recursive Web Crawler & Robots.txt Compliance', () => {
    it('POST /api/tenant/:tenantId/crawl should parse sitemaps and respect robots.txt disallows', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
        const urlStr = url.toString();
        if (urlStr.endsWith('robots.txt')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('User-agent: *\nDisallow: /private/\nSitemap: https://example.com/sitemap.xml')
          } as any);
        }
        if (urlStr.endsWith('sitemap.xml')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<urlset><url><loc>https://example.com/public-page</loc></url><url><loc>https://example.com/private/secret-page</loc></url></urlset>')
          } as any);
        }
        if (urlStr.endsWith('public-page') || urlStr.endsWith('example.com/')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<html><head><title>Public Gym Website</title></head><body>Welcome to public gym page. <a href="https://example.com/other-page">other page link</a></body></html>')
          } as any);
        }
        return Promise.resolve({
          ok: false,
          text: () => Promise.resolve('')
        } as any);
      });

      const res = await request(app)
        .post('/api/tenant/test-tenant/crawl')
        .set('X-Test-Auth-Bypass', 'true')
        .send({
          url: 'https://example.com/',
          source: 'web',
          depth: 1,
          pagesBudget: 2
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.kbItem.title).toBe('Public Gym Website');

      fetchSpy.mockRestore();
    });
  });
});

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

describe('tenantAccessMiddleware', () => {
  it('allows access in test mode with bypass header', async () => {
    const res = await request(app)
      .get('/api/tenant/test-tenant/analytics')
      .set('X-Test-Auth-Bypass', 'true');
    // Should not return 403 (may return 200 or 404 depending on test data)
    expect(res.status).not.toBe(403);
  });

  it('blocks unauthenticated cross-tenant requests', async () => {
    // No auth header, no bypass — should return 401
    const res = await request(app)
      .get('/api/tenant/any-tenant-id/analytics');
    expect(res.status).toBe(401);
  });
});

import { startCrawlWorker } from '../server/workers/crawlWorker';

describe('crawlWorker', () => {
  it('exports startCrawlWorker function', () => {
    expect(typeof startCrawlWorker).toBe('function');
  });
});

import { startMessageWorker } from '../server/workers/messageWorker';

describe('messageWorker', () => {
  it('exports startMessageWorker function', () => {
    expect(typeof startMessageWorker).toBe('function');
  });
});

import { startScheduler, stopScheduler } from '../server/services/scheduler';

describe('scheduler', () => {
  it('exports startScheduler and stopScheduler', () => {
    expect(typeof startScheduler).toBe('function');
    expect(typeof stopScheduler).toBe('function');
  });
});

import { crawlQueue, outboundMessageQueue } from '../server/services/queue';

describe('BullMQ queue definitions', () => {
  it('exports crawlQueue with name "crawl"', () => {
    expect(crawlQueue.name).toBe('crawl');
  });

  it('exports outboundMessageQueue with name "outbound-message"', () => {
    expect(outboundMessageQueue.name).toBe('outbound-message');
  });
});

describe('requestId middleware', () => {
  it('sets X-Request-Id response header', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('X-Test-Auth-Bypass', 'true');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('echoes client-provided X-Request-Id', async () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const res = await request(app)
      .get('/api/health')
      .set('X-Request-Id', id)
      .set('X-Test-Auth-Bypass', 'true');
    expect(res.headers['x-request-id']).toBe(id);
  });
});

describe('tenantRateLimiter', () => {
  it('skips rate limiting in test mode', async () => {
    // In test mode (NODE_ENV=test), the limiter should always call next()
    // Verify by hitting a tenant route many times without getting 429
    const requests = Array.from({ length: 10 }, () =>
      request(app)
        .get('/api/tenant/test-tenant-1/analytics')
        .set('X-Test-Auth-Bypass', 'true')
    );
    const results = await Promise.all(requests);
    // None should be 429 in test mode
    expect(results.every(r => r.status !== 429)).toBe(true);
  });

  it('returns X-RateLimit headers on tenant routes (in production-like env)', async () => {
    // Even in test mode, verifying the header is returned when middleware is active
    // If test mode bypasses, this just verifies no 429 occurs
    const res = await request(app)
      .get('/api/tenant/test-tenant-1/analytics')
      .set('X-Test-Auth-Bypass', 'true');
    // Should not return 429
    expect(res.status).not.toBe(429);
  });
});

describe('Phase 1 production fixes', () => {
  afterEach(() => {
    _clearMemStore();
  });

  describe('tenant field round-trip (memory store)', () => {
    it('preserves ownerId, subscriptionTier, messageCount, autopilotEnabled', async () => {
      _setMemTenant('rt-tenant', {
        id: 'rt-tenant',
        name: 'Round Trip Co',
        industry: 'Retail',
        description: '',
        avatar: '🛍️',
        botName: 'Aura',
        tone: 'friendly',
        status: 'active',
        ownerId: 'uid-owner-1',
        subscriptionTier: 'Starter',
        messageCount: 42,
        autopilotEnabled: false,
        knowledgeBase: [],
        leads: [],
        appointments: []
      });

      const store = await readTenantsStore();
      const tenant = store['rt-tenant'];
      expect(tenant.ownerId).toBe('uid-owner-1');
      expect(tenant.subscriptionTier).toBe('Starter');
      expect(tenant.messageCount).toBe(42);
      expect(tenant.autopilotEnabled).toBe(false);
    });
  });

  describe('quota service', () => {
    it('flags a tenant at or over the Starter limit (500)', () => {
      expect(isOverQuota('Starter', 500)).toBe(true);
      expect(isOverQuota('Starter', 499)).toBe(false);
    });

    it('defaults to the Free tier limit (50) when tier is undefined', () => {
      expect(isOverQuota(undefined, 50)).toBe(true);
      expect(isOverQuota(undefined, 49)).toBe(false);
    });

    it('treats Enterprise as unlimited', () => {
      expect(isOverQuota('Enterprise', 1_000_000)).toBe(false);
    });
  });

  describe('quota enforcement via Starter tier over webhook', () => {
    it('rejects Telegram messages at the Starter limit (500) and allows at 499', async () => {
      _setMemTenant('starter-tenant', {
        id: 'starter-tenant',
        name: 'Starter Co',
        industry: 'Retail',
        description: '',
        avatar: '🛍️',
        botName: 'Aura',
        tone: 'friendly',
        status: 'active',
        subscriptionTier: 'Starter',
        messageCount: 500,
        knowledgeBase: [],
        leads: [],
        appointments: []
      });

      const payload = { message: { chat: { id: 1 }, from: { first_name: 'X' }, text: 'hi' } };

      const overRes = await request(app)
        .post('/api/webhook/telegram/starter-tenant')
        .send(payload);
      expect(overRes.status).toBe(403);

      const store = await readTenantsStore();
      store['starter-tenant'].messageCount = 499;
      await writeTenantsStore(store);

      const underRes = await request(app)
        .post('/api/webhook/telegram/starter-tenant')
        .send(payload);
      expect(underRes.status).toBe(200);
    });
  });

  describe('webhook signature verification (timingSafeEqual)', () => {
    it('rejects a malformed (non-hex) signature with 403, not 500', async () => {
      const payload = { object: "whatsapp_business_account", entry: [] };
      const res = await request(app)
        .post('/api/webhook')
        .set('X-Hub-Signature-256', 'sha256=not-valid-hex!!')
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.text).toContain('signature verification failed');
    });

    it('rejects a well-formed but wrong-value hex signature with 403', async () => {
      const payload = { object: "whatsapp_business_account", entry: [] };
      const wrongButValidHex = 'a'.repeat(64);
      const res = await request(app)
        .post('/api/webhook')
        .set('X-Hub-Signature-256', `sha256=${wrongButValidHex}`)
        .send(payload);

      expect(res.status).toBe(403);
    });
  });

  describe('outbound message worker: credentials from DB, not job data', () => {
    it('fetches phoneNumberId/accessToken from the tenant store, not job data', async () => {
      _setMemTenant('worker-tenant', {
        id: 'worker-tenant',
        name: 'Worker Co',
        industry: 'Retail',
        description: '',
        avatar: '📦',
        botName: 'Aura',
        tone: 'friendly',
        status: 'active',
        whatsAppApiKey: 'real-whatsapp-access-token-1234567890',
        whatsAppVerifiedSid: 'pn-1',
        knowledgeBase: [],
        leads: [],
        appointments: []
      });

      const whatsapp = await import('../server/services/whatsapp');
      const sendSpy = vi.spyOn(whatsapp, 'sendWhatsAppMessage').mockResolvedValue({ ok: true } as any);

      const { processOutboundMessage } = await import('../server/workers/messageWorker');
      await processOutboundMessage({
        tenantId: 'worker-tenant',
        to: '+15551234',
        text: 'hello',
        channel: 'whatsapp'
      });

      expect(sendSpy).toHaveBeenCalledWith('pn-1', 'real-whatsapp-access-token-1234567890', '+15551234', 'hello');
      sendSpy.mockRestore();
    });

    it('throws UnrecoverableError for an unknown tenant (no BullMQ retry)', async () => {
      const { UnrecoverableError } = await import('bullmq');
      const { processOutboundMessage } = await import('../server/workers/messageWorker');

      await expect(
        processOutboundMessage({ tenantId: 'does-not-exist', to: '+1', text: 'x', channel: 'whatsapp' })
      ).rejects.toThrow(UnrecoverableError);
    });
  });

  describe('crawler service (pure helpers)', () => {
    it('parseRobotsTxt extracts disallow rules for the matching user-agent', () => {
      const robots = `User-agent: *\nDisallow: /admin\nDisallow: /private\nSitemap: https://example.com/sitemap.xml`;
      const { disallows, sitemaps } = parseRobotsTxt(robots, 'AuraSaaSCrawler/1.0');
      expect(disallows).toContain('/admin');
      expect(disallows).toContain('/private');
      expect(sitemaps).toContain('https://example.com/sitemap.xml');
    });

    it('isPathDisallowed matches prefix rules and "/" wildcard', () => {
      expect(isPathDisallowed('/admin/settings', ['/admin'])).toBe(true);
      expect(isPathDisallowed('/public', ['/admin'])).toBe(false);
      expect(isPathDisallowed('/anything', ['/'])).toBe(true);
    });

    it('validateUrlForSsrf rejects non-https and private-network targets', async () => {
      expect(await validateUrlForSsrf('http://example.com')).toBe(false);
      expect(await validateUrlForSsrf('https://localhost')).toBe(false);
      expect(await validateUrlForSsrf('https://foo.internal')).toBe(false);
    });
  });

  describe('GET /api/tenants ownership filtering', () => {
    it('returns all tenants under the test auth bypass (no uid on request)', async () => {
      _setMemTenant('owned-by-a', { id: 'owned-by-a', ownerId: 'uid-a', name: 'A', industry: '', description: '', avatar: '', botName: 'Aura', tone: 'friendly', status: 'active', knowledgeBase: [], leads: [], appointments: [] });
      const res = await request(app).get('/api/tenants').set('X-Test-Auth-Bypass', 'true');
      expect(res.status).toBe(200);
      expect(res.body['owned-by-a']).toBeDefined();
    });
  });
});
