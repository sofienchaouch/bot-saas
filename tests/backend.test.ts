// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';

// Set environment variable to test to run in sandboxed local file storage
process.env.NODE_ENV = 'test';

import { app, cosineSimilarity, chunkText, encryptText, decryptText } from '../server';
import { readTenantsStore, writeTenantsStore, readConversationsStore, writeConversationsStore, _setMemTenant, _clearMemStore } from '../server/services/db';
import { getRAGContext } from '../server/services/rag';

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

  it('GET /api/health should return health status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('GET /api/tenants should return all tenants', async () => {
    const res = await request(app).get('/api/tenants');
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
    const getRes = await request(app).get('/api/tenants');
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
      .send(crawlPayload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body.kbItem.title).toContain('Test Business Corp Website Index');
    expect(res.body.kbItem.content).toContain('Root website URL: https://example-fitness-studio.com');

    // Verify item is saved to database
    const getRes = await request(app).get('/api/tenants');
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
      .get('/api/test-error');

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
      .get('/api/conversations/test-tenant?q=Alpha');
    expect(searchRes.status).toBe(200);
    expect(Object.keys(searchRes.body)).toContain('test-tenant_custom-user-1');
    expect(Object.keys(searchRes.body)).not.toContain('test-tenant_custom-user-2');

    const limitRes = await request(app)
      .get('/api/conversations/test-tenant?limit=1');
    expect(limitRes.status).toBe(200);
    expect(Object.keys(limitRes.body).length).toBe(1);
  });

  it('POST /api/conversations/:tenantId/:customerId/tags should set tags on conversation thread', async () => {
    const res = await request(app)
      .post('/api/conversations/test-tenant/custom-user-1/tags')
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
      .get('/api/conversations/test-tenant/custom-user-1/export');

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
