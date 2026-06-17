// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

// Set environment variable to test to run in sandboxed local file storage
process.env.NODE_ENV = 'test';

import { app, cosineSimilarity, chunkText, encryptText, decryptText } from '../server';

const TEST_TENANTS_FILE = path.join(process.cwd(), 'tenants_store.test.json');
const TEST_CONVERSATIONS_FILE = path.join(process.cwd(), 'webhook_conversations.test.json');

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
    // Write a clean mock store file
    const mockStore = {
      'test-tenant': {
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
      }
    };
    fs.writeFileSync(TEST_TENANTS_FILE, JSON.stringify(mockStore, null, 2), 'utf-8');
    fs.writeFileSync(TEST_CONVERSATIONS_FILE, JSON.stringify({}, null, 2), 'utf-8');
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(TEST_TENANTS_FILE)) {
      fs.unlinkSync(TEST_TENANTS_FILE);
    }
    if (fs.existsSync(TEST_CONVERSATIONS_FILE)) {
      fs.unlinkSync(TEST_CONVERSATIONS_FILE);
    }
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

    // Read test database file and verify lead was auto-qualified and inserted in CRM list
    const fileContent = fs.readFileSync(TEST_TENANTS_FILE, 'utf-8');
    const store = JSON.parse(fileContent);
    
    // Check decrypted version if server does encryption (server decrypts when reading, but encrypts when writing)
    const tenant = store['test-tenant'];
    expect(tenant.appointments).toHaveLength(1);
    expect(tenant.leads).toHaveLength(1);
    // Since server encrypts write output, let's verify leads data by calling GET /api/tenants which decrypts it automatically
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
});
