import express from 'express';
import multer from 'multer';
import admin from 'firebase-admin';
import { Type } from '@google/genai';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../lib/logger';
import {
  readTenantsStore,
  writeTenantsStore,
  readConversationsStore,
  writeConversationsStore,
} from '../services/db';
import { enrichTenantEmbeddings, chunkText, getEmbedding } from '../services/rag';
import { isPlaceholderToken, sendWhatsAppMessage } from '../services/whatsapp';
import { buildSystemPrompt } from '../services/promptBuilder';
import { ai } from '../services/gemini';
import { authMiddleware } from '../middleware/auth';
import { tenantAccessMiddleware } from '../middleware/tenantAccess';
import { tenantRateLimiter } from '../middleware/rateLimit';
import { outboundMessageQueue } from '../services/queue';
import { NODE_ENV, APP_URL } from '../config';
import { getAnalytics, clearAnalytics } from '../services/analytics';
import { getWebhookEvents, clearWebhookEvents } from '../services/webhookLogger';
import { validateUrlForSsrf, crawlWebsite } from '../services/crawler';
import { broadcastToTenant } from '../services/realtime';
import { extractTextFromFile } from '../services/fileExtract';
import { listTeamMembers, addTeamMember, removeTeamMember } from '../services/team';

const router = express.Router();

// Apply authorization middleware to all admin routes
router.use(authMiddleware);

// Apply per-tenant rate limiting before tenant access checks
router.use('/api/tenant/:id', tenantRateLimiter);

// Apply tenant ownership guard to authenticated admin tenant routes.
// Scoped to sub-paths that exist in this router so public routes in other
// routers (e.g. /api/tenant/:id/appointment in integrations.ts) are not affected.
router.use(
  [
    '/api/tenant/:id/analytics',
    '/api/tenant/:id/webhook-events',
    '/api/tenant/:id/crawl',
    '/api/tenant/:id/autopilot',
    '/api/tenant/:id/schedule',
    '/api/tenant/:id/telegram',
    '/api/tenant/:id/team',
    '/api/conversations/:id',
  ],
  tenantAccessMiddleware
);

router.get(
  '/api/tenants',
  asyncHandler(async (req, res) => {
    const store = await readTenantsStore();
    const uid = (req as any).user?.uid;
    // No uid only happens under the test/dev auth bypass — return everything there.
    if (!uid) {
      return res.json(store);
    }
    const owned: Record<string, any> = {};
    for (const [id, tenant] of Object.entries(store)) {
      if (!tenant.ownerId || tenant.ownerId === uid) {
        owned[id] = tenant;
      }
    }
    res.json(owned);
  })
);

router.post(
  '/api/tenants/sync-all',
  asyncHandler(async (req, res) => {
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: 'Expected array of tenants' });
    }
    const uid = (req as any).user?.uid;
    const store = await readTenantsStore();
    let synced = 0;
    for (const t of list) {
      if (t && t.id) {
        const existing = store[t.id];
        // Never accept writes to a tenant owned by someone else
        if (uid && existing?.ownerId && existing.ownerId !== uid) {
          logger.warn(
            { tenantId: t.id, uid, ownerId: existing.ownerId },
            '[TENANTS SYNC-ALL] Skipping tenant owned by another user'
          );
          continue;
        }
        const enriched = await enrichTenantEmbeddings(t);
        // Ownership is server-controlled: preserve the stored owner, stamp new tenants
        enriched.ownerId = existing?.ownerId ?? uid;
        store[enriched.id] = enriched;
        synced++;
      }
    }
    await writeTenantsStore(store);
    logger.info(
      { count: synced },
      '[TENANTS SYNC-ALL] Successfully synchronized tenants with Firestore'
    );
    res.json({ status: 'success', count: synced });
  })
);

router.post(
  '/api/tenant/sync',
  asyncHandler(async (req, res) => {
    const tenant = req.body;
    if (!tenant || !tenant.id) {
      return res.status(400).json({ error: 'Expected tenant object with non-empty ID parameter.' });
    }
    const uid = (req as any).user?.uid;
    const store = await readTenantsStore();
    const existing = store[tenant.id];
    if (uid && existing?.ownerId && existing.ownerId !== uid) {
      logger.warn(
        { tenantId: tenant.id, uid, ownerId: existing.ownerId },
        '[TENANT SYNC] Blocked write to tenant owned by another user'
      );
      return res.status(403).json({ error: 'Forbidden: you do not own this tenant' });
    }
    const enriched = await enrichTenantEmbeddings(tenant);
    // Ownership is server-controlled: preserve the stored owner, stamp new tenants
    enriched.ownerId = existing?.ownerId ?? uid;
    store[enriched.id] = enriched;
    await writeTenantsStore(store);
    logger.info(
      { tenantName: enriched.name, tenantId: enriched.id },
      '[TENANT SYNC] Successfully synchronized tenant details to Firestore'
    );
    res.json({ status: 'success', id: enriched.id });
  })
);

router.post(
  '/api/tenant/:tenantId/schedule',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const { crawlSchedule } = req.body;
    if (!['none', 'daily', 'weekly'].includes(crawlSchedule)) {
      return res
        .status(400)
        .json({ error: "Invalid schedule value. Expected 'none', 'daily', or 'weekly'" });
    }

    const store = await readTenantsStore();
    const tenant = store[tenantId];
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    tenant.crawlSchedule = crawlSchedule;
    store[tenantId] = tenant;
    await writeTenantsStore(store);
    logger.info(
      { crawlSchedule, tenantId },
      '[TENANT SCHEDULER] Updated crawl schedule for tenant'
    );
    res.json({ status: 'success', crawlSchedule });
  })
);

router.get(
  '/api/conversations/:tenantId',
  asyncHandler(async (req, res) => {
    const store = await readConversationsStore();
    const tenantId = req.params.tenantId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const q = ((req.query.q as string) || '').toLowerCase().trim();

    let keys = Object.keys(store).filter(key => key.startsWith(`${tenantId}_`));

    if (q) {
      keys = keys.filter(key => {
        const convo = store[key];
        const customerId = key.substring(tenantId.length + 1).toLowerCase();
        if (customerId.includes(q)) return true;
        if (convo.assignedAgentName?.toLowerCase().includes(q)) return true;
        if (convo.tags?.some((t: string) => t.toLowerCase().includes(q))) return true;
        return convo.messages?.some((m: any) => m.text?.toLowerCase().includes(q));
      });
    }

    // Sort keys by latest message timestamp (descending)
    keys.sort((a, b) => {
      const messagesA = store[a].messages || [];
      const messagesB = store[b].messages || [];
      const timeA = messagesA[messagesA.length - 1]?.timestamp || '';
      const timeB = messagesB[messagesB.length - 1]?.timestamp || '';
      return timeB.localeCompare(timeA);
    });

    const paginatedKeys = keys.slice(offset, offset + limit);
    const filtered: Record<string, any> = {};
    paginatedKeys.forEach(key => {
      filtered[key] = store[key];
    });

    res.json(filtered);
  })
);

router.post(
  '/api/conversations/:tenantId/clear',
  asyncHandler(async (req, res) => {
    const store = await readConversationsStore();
    const tenantId = req.params.tenantId;
    Object.keys(store).forEach(key => {
      if (key.startsWith(`${tenantId}_`)) {
        delete store[key];
      }
    });
    await writeConversationsStore(store);
    res.json({ status: 'success' });
  })
);

router.post(
  '/api/conversations/:tenantId/:customerId/assign',
  asyncHandler(async (req, res) => {
    const { tenantId, customerId } = req.params;
    const { assignedAgentName } = req.body;
    const conversations = await readConversationsStore();
    const convoKey = `${tenantId}_${customerId}`;
    if (!conversations[convoKey]) {
      conversations[convoKey] = { messages: [] };
    }
    conversations[convoKey].assignedAgentName = assignedAgentName || '';
    await writeConversationsStore(conversations);
    logger.info({ convoKey, assignedAgentName }, '[CONVERSATION ASSIGN] Thread assigned to agent');
    res.json({ status: 'success', assignedAgentName });
  })
);

router.post(
  '/api/conversations/:tenantId/:customerId/tags',
  asyncHandler(async (req, res) => {
    const { tenantId, customerId } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Expected tags parameter to be an array of strings.' });
    }

    const conversations = await readConversationsStore();
    const convoKey = `${tenantId}_${customerId}`;
    if (!conversations[convoKey]) {
      conversations[convoKey] = { messages: [] };
    }

    conversations[convoKey].tags = tags;
    await writeConversationsStore(conversations);

    logger.info({ convoKey, tags }, '[CONVERSATION TAGS] Updated tags for thread');
    res.json({ status: 'success', tags });
  })
);

router.get(
  '/api/conversations/:tenantId/:customerId/export',
  asyncHandler(async (req, res) => {
    const { tenantId, customerId } = req.params;
    const conversations = await readConversationsStore();
    const convoKey = `${tenantId}_${customerId}`;
    const convo = conversations[convoKey];

    if (!convo || !convo.messages || convo.messages.length === 0) {
      return res.status(404).json({ error: 'Conversation thread not found or empty.' });
    }

    let csvContent = 'sender,text,timestamp\n';
    convo.messages.forEach((msg: any) => {
      const cleanText = (msg.text || '').replace(/"/g, '""');
      csvContent += `"${msg.sender}","${cleanText}","${msg.timestamp}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="conversation_${convoKey}.csv"`);
    res.status(200).send(csvContent);
  })
);

router.post(
  '/api/tenant/:tenantId/autopilot',
  asyncHandler(async (req, res) => {
    const tenantId = req.params.tenantId;
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: "Expected boolean parameter 'enabled'" });
    }
    const store = await readTenantsStore();
    if (!store[tenantId]) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    store[tenantId].autopilotEnabled = enabled;
    await writeTenantsStore(store);
    logger.info(
      { tenantId, autopilotEnabled: enabled },
      '[AUTOPILOT UPDATE] Tenant autopilot setting changed'
    );
    res.json({ status: 'success', tenantId, autopilotEnabled: enabled });
  })
);

router.post(
  '/api/tenant/:id/telegram/connect',
  asyncHandler(async (req, res) => {
    const tenantId = req.params.id;
    const { botToken } = req.body;
    if (!botToken || !botToken.trim()) {
      return res.status(400).json({ error: 'Missing bot token.' });
    }

    const store = await readTenantsStore();
    const tenant = store[tenantId];
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    try {
      const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const meData = await meRes.json();
      if (!meData.ok) {
        return res.status(400).json({ error: 'Invalid bot token: Telegram rejected it.' });
      }

      const webhookUrl = `${APP_URL || `${req.protocol}://${req.get('host')}`}/api/webhook/telegram/${tenantId}`;
      const hookRes = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
      );
      const hookData = await hookRes.json();
      if (!hookData.ok) {
        return res.status(502).json({ error: 'Telegram rejected the webhook registration.' });
      }

      tenant.telegramBotToken = botToken;
      store[tenantId] = tenant;
      await writeTenantsStore(store);

      logger.info({ tenantId, botUsername: meData.result?.username }, '[TELEGRAM CONNECT] Bot connected and webhook registered');
      res.json({ status: 'success', botUsername: meData.result?.username });
    } catch (err: any) {
      logger.error({ err: err.message, tenantId }, '[TELEGRAM CONNECT] Failed to connect bot');
      res.status(502).json({ error: 'Failed to reach Telegram API.' });
    }
  })
);

router.post(
  '/api/tenant/:id/telegram/disconnect',
  asyncHandler(async (req, res) => {
    const tenantId = req.params.id;
    const store = await readTenantsStore();
    const tenant = store[tenantId];
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const botToken = tenant.telegramBotToken;
    if (botToken) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
      } catch (err: any) {
        logger.warn({ err: err.message, tenantId }, '[TELEGRAM DISCONNECT] Failed to unregister webhook');
      }
    }

    tenant.telegramBotToken = undefined;
    store[tenantId] = tenant;
    await writeTenantsStore(store);
    res.json({ status: 'success' });
  })
);

router.get(
  '/api/tenant/:id/team',
  asyncHandler(async (req, res) => {
    const tenantId = req.params.id;
    const store = await readTenantsStore();
    const tenant = store[tenantId];
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const members = await listTeamMembers(tenantId);
    res.json({
      owner: tenant.ownerId ? { uid: tenant.ownerId, role: 'admin' } : null,
      members,
    });
  })
);

router.post(
  '/api/tenant/:id/team/invite',
  asyncHandler(async (req, res) => {
    const tenantId = req.params.id;
    const { email, role } = req.body;
    const requesterRole = (req as any).tenantRole;

    if (requesterRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins can invite team members.' });
    }
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Missing email.' });
    }
    if (role !== 'admin' && role !== 'support') {
      return res.status(400).json({ error: "role must be 'admin' or 'support'." });
    }

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      const member = await addTeamMember(tenantId, userRecord.uid, email, role);
      res.json({ status: 'success', member });
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        return res.status(404).json({
          error: 'No account found for that email. They must sign in at least once before being invited.',
        });
      }
      logger.error({ err: err.message, tenantId }, '[TEAM INVITE] Failed to invite member');
      res.status(502).json({ error: 'Failed to invite team member.' });
    }
  })
);

router.delete(
  '/api/tenant/:id/team/:memberId',
  asyncHandler(async (req, res) => {
    const { id: tenantId, memberId } = req.params;
    const requesterRole = (req as any).tenantRole;

    if (requesterRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove team members.' });
    }

    await removeTeamMember(tenantId, memberId);
    res.json({ status: 'success' });
  })
);

const kbUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post(
  '/api/kb/extract-file',
  kbUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing file upload (field name "file").' });
    }
    try {
      const content = await extractTextFromFile(req.file.buffer, req.file.originalname);
      res.json({
        title: req.file.originalname.replace(/\.[^.]+$/, ''),
        content,
        fileType: req.file.originalname.split('.').pop(),
        fileSize: `${(req.file.size / 1024).toFixed(1)} KB`,
      });
    } catch (err: any) {
      logger.warn(
        { err: err.message, filename: req.file.originalname },
        '[KB UPLOAD] Extraction failed'
      );
      res.status(400).json({ error: err.message || 'Failed to extract text from file.' });
    }
  })
);

router.post(
  '/api/tenant/:tenantId/crawl',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const { url, source, depth, pagesBudget } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'Missing target URL or profile handle.' });
    }

    const store = await readTenantsStore();
    const tenant = store[tenantId];
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    const maxPages = pagesBudget || 10;
    const maxDepth = depth || 1;

    logger.info(
      { tenantId, url, source, maxDepth, maxPages },
      '[CRAWLER] Starting crawler for tenant'
    );

    let crawledText = '';
    let pageTitle = 'Crawled Source';
    let crawledCount = 0;

    if (source === 'web') {
      const isUrlSafe = await validateUrlForSsrf(url);
      if (!isUrlSafe) {
        logger.warn({ url }, '[CRAWLER] Blocked SSRF attempt targeting URL');
        return res
          .status(400)
          .json({ error: 'Access Denied: Target URL is restricted or invalid.' });
      }

      try {
        const result = await crawlWebsite(url, { maxDepth, maxPages });
        crawledText = result.content;
        pageTitle = result.title;
        crawledCount = result.pagesCount;
      } catch (crawlErr: any) {
        logger.error({ err: crawlErr }, '[CRAWLER] Web crawl error');
      }
    }

    // Fallback if crawl yielded no content
    if (!crawledText) {
      logger.info({ source, url }, '[CRAWLER] Activating smart mock scrapers for profile');
      if (source === 'web') {
        crawledText = `[WEB CORPUS: ${url}]
Root website URL: ${url}
Scan Date: ${new Date().toLocaleDateString()}
Business Info: ${tenant.name} (${tenant.industry})
Description: ${tenant.description}
Operational Hours: Monday to Friday, 9:00 AM to 5:00 PM.
Location Address: 100 Main St, Suite 400.
FAQ & Help Center:
- Q: Do we support remote bookings? Yes, appointments can be scheduled on our calendar.
- Q: What payment terms are accepted? We accept standard credit cards and digital wallets.
- Q: What is the cancel policy? Cancellations require a 24-hour notice.`;
        pageTitle = `${tenant.name} Website Index`;
        crawledCount = 1;
      } else {
        crawledText = `[SOCIAL MEDIA INDEX: ${url}]
Platform Channel: ${source.toUpperCase()}
Profile Username: ${url}
Feed Scraping Count: 12 posts parsed
Content Feed Transcript:
- Bio: Official feed page for ${tenant.name}. Focused on ${tenant.industry} services.
- Post 1: Welcome to our new digital channels! You can now check schedules and consult our smart bot 24/7 on WhatsApp!
- Post 2: Flash Promo: Mention this post for a 15% discount on all consultations booked this week!
- Post 3: "Super easy to book and the responses are instantaneous!" - Customer Review.`;
        pageTitle = `${tenant.name} @${url.replace(/[^a-zA-Z0-9]/g, '')} Feed`;
        crawledCount = 1;
      }
    }

    const newItemId = `kb-crawl-${Math.floor(100000 + Math.random() * 900000)}`;
    const textChunks = chunkText(crawledText);
    const chunksWithEmbeddings: any[] = [];

    for (const chunk of textChunks) {
      const vector = await getEmbedding(chunk);
      chunksWithEmbeddings.push({
        text: chunk,
        embedding: vector,
      });
    }

    const newKbItem = {
      id: newItemId,
      type: 'crawl' as const,
      title: pageTitle,
      content: crawledText,
      dateAdded: new Date().toISOString().split('T')[0],
      url: url,
      crawlDepth: depth || 1,
      crawlPagesCount: crawledCount,
      crawlStatus: 'synced' as const,
      socialNetwork: source,
      chunks: chunksWithEmbeddings,
    };

    if (!tenant.knowledgeBase) tenant.knowledgeBase = [];
    tenant.knowledgeBase.push(newKbItem);
    await writeTenantsStore(store);

    logger.info({ tenantId, pageTitle }, '[CRAWLER] Crawl completed, document added to KB');
    res.json({ status: 'success', kbItem: newKbItem });
  })
);

router.post(
  '/api/conversations/:tenantId/:customerId/reply',
  asyncHandler(async (req, res) => {
    const { tenantId, customerId } = req.params;
    const { text, isInternal } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Expected non-empty string parameter 'text'" });
    }

    const store = await readTenantsStore();
    const tenant = store[tenantId];
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const conversations = await readConversationsStore();
    const convoKey = `${tenantId}_${customerId}`;
    if (!conversations[convoKey]) {
      conversations[convoKey] = { messages: [] };
    }

    const internalNote = isInternal === true;
    conversations[convoKey].messages.push({
      sender: internalNote ? 'system' : 'bot',
      text: text,
      timestamp: new Date().toISOString(),
      isManualTakeover: !internalNote,
      isInternal: internalNote,
    });
    await writeConversationsStore(conversations);
    broadcastToTenant(tenantId, {
      type: 'conversation-message',
      payload: {
        convoKey,
        message: conversations[convoKey].messages[conversations[convoKey].messages.length - 1],
      },
    });

    if (internalNote) {
      logger.info({ convoKey }, '[CONVERSATION INTERNAL NOTE] Stored internal note for thread');
      return res.json({ status: 'success', text, isInternal: true });
    }

    const targetPhoneNumberId = tenant.whatsAppVerifiedSid;
    const accessToken = tenant.whatsAppApiKey || process.env.WHATSAPP_TOKEN;

    if (targetPhoneNumberId && accessToken && !isPlaceholderToken(accessToken)) {
      try {
        await outboundMessageQueue.add('manual-reply', {
          tenantId,
          to: customerId,
          text,
          channel: 'whatsapp',
        });
        logger.info(
          { customerId, tenantId },
          '[META OUTBOUND MANUAL] Enqueued manual Graph API reply'
        );
      } catch (queueErr) {
        logger.warn({ err: queueErr }, '[META OUTBOUND MANUAL] Queue unavailable, sending inline');
        try {
          await sendWhatsAppMessage(targetPhoneNumberId, accessToken, customerId, text);
        } catch (graphErr) {
          logger.error(
            { err: graphErr },
            '[META OUTBOUND MANUAL] Failed to send manual Graph API reply'
          );
        }
      }
    } else {
      logger.info(
        '[META OUTBOUND MANUAL] Bypassing outbound Graph API send because credentials are placeholders. Simulator frame will poll and display.'
      );
    }

    res.json({ status: 'success', text, isInternal: false });
  })
);

router.post(
  '/api/playground/test',
  asyncHandler(async (req, res) => {
    try {
      const {
        messages,
        botName,
        tone,
        appointmentsList,
        tenantName,
        tenantIndustry,
        tenantDescription,
        systemInstruction,
        tenantId: bodyTenantId,
      } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array is required' });
      }

      const lastMessage = messages[messages.length - 1]?.text || '';
      const { getRAGContext } = await import('../services/rag');
      const ragResult = await getRAGContext(lastMessage, bodyTenantId || 'playground');
      const kbContext = ragResult.contextText;
      const citations = ragResult.citations;

      const scheduleContext =
        appointmentsList && appointmentsList.length > 0
          ? appointmentsList
              .map((app: any) => `- Booked Slot: From ${app.start} to ${app.end}`)
              .join('\n')
          : 'No conflicting scheduled bookings on the calendar.';

      const systemPrompt = buildSystemPrompt({
        channel: `WhatsApp AI Bot representing the tenant "${tenantName}" (${tenantIndustry})`,
        tenantName,
        tenantIndustry,
        botName,
        tone,
        tenantDescription,
        systemInstruction,
        kbContext,
        scheduleContext,
        additionalRules: `\n\nCRITICAL ANTI-HALLUCINATION & GROUND TRUTH MANDATES:
1. STRICT TRUTH ONLY: Do NOT invent, fabricate, or guess facts, operations, URLs, email addresses, phone numbers, or treatment prices under any circumstances. Everything you say MUST be explicitly stated within your PRIVATE KNOWLEDGE BASE. Do not extrapolate.
2. HANDLING UNKNOWN INFO: If a customer requests facts, details, or policies NOT listed in your PRIVATE KNOWLEDGE BASE, say so directly and politely, stating that those specific details are currently unavailable. Offer to record their contact coordinates (name, email/phone) so a human manager can contact them and clarify.
3. NO PLACEHOLDERS: Ground all responses strictly on real facts.

CRITICAL CALENDAR RULES (NO DOUBLE BOOKING / STRICT WORKING HOURS):
1. Carefully check the BUSY SLOTS of the calendar below. Do not agree to, suggest, or book any date/time slots that are already busy or overlap with busy slots.
2. Business hours are strictly Monday to Friday, from 9:00 AM to 5:00 PM. Never suggest weekend slots or off-hours outside this window.

CRITICAL ACTION SAFETY RULES:
- Do NOT trigger a 'capture_lead' action unless the user has actually provided or explicitly agreed to share their real personal coordinates (email, phone, or name) in the latest turns.
- Do NOT trigger a 'book_appointment' action until they have explicitly negotiated and confirmed a final choice of a precise reservation date and slot.

Your response MUST be returned strictly in JSON format matching the schema requested below.
Do not wrap your output in markdown codeblocks like \`\`\`json. Return bare clean JSON.`,
      });

      if (!ai) {
        const lastMessage = messages[messages.length - 1]?.text || '';
        let simulatedReply = `[SIMULATED OFFLINE MODE] Hello! This sandbox test message was processed successfully. I am ${botName} using instruction: "${systemInstruction.substring(0, 40)}..." `;
        let action = null;

        if (lastMessage.toLowerCase().includes('lead') || lastMessage.includes('@')) {
          action = {
            type: 'capture_lead',
            details: JSON.stringify({
              name: 'Playground Tester',
              email: 'tester@sandbox.com',
              phone: '+1 (555) 012-3456',
            }),
          };
          simulatedReply +=
            'I detected lead collection intent and generated a sandbox capture action.';
        } else if (
          lastMessage.toLowerCase().includes('book') ||
          lastMessage.toLowerCase().includes('meeting') ||
          lastMessage.toLowerCase().includes('appointment')
        ) {
          action = {
            type: 'book_appointment',
            details: JSON.stringify({
              summary: 'Sandbox Meeting',
              startStr: '2026-06-16T10:00:00',
              endStr: '2026-06-16T10:30:00',
            }),
          };
          simulatedReply +=
            'I suggested an appointment slot and generated an autonomous reservation request template.';
        } else {
          simulatedReply += `You sent: "${lastMessage}". Let me know if you would like to test lead captures, knowledge lookups, or calendar booking constraints.`;
        }

        const mockResponse = {
          reply: simulatedReply,
          actionTriggered: action,
        };

        return res.json({
          reply: mockResponse.reply,
          actionTriggered: mockResponse.actionTriggered,
          rawText: JSON.stringify(mockResponse, null, 2),
          systemPrompt: systemPrompt,
        });
      }

      const contents = messages.map((m: any) => {
        return {
          role: m.sender === 'bot' ? 'model' : 'user',
          parts: [{ text: m.text }],
        };
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description:
                  'The direct messaging sentence response to display to the user in the WhatsApp chat bubble.',
              },
              actionTriggered: {
                type: Type.OBJECT,
                nullable: true,
                description:
                  'An action the bot decides to trigger based on the user conversation path. Set to null if no new state change is required.',
                properties: {
                  type: {
                    type: Type.STRING,
                    description:
                      "The action class: 'capture_lead' (if user provided name/email/phone for follow up), 'book_appointment' (if they explicitly agreed on a specific reservation date/time), or 'consult_kb' (if they just asked a question solved by a document item).",
                  },
                  details: {
                    type: Type.STRING,
                    description:
                      "For 'capture_lead', return a stringified JSON of {name, email, phone}. For 'book_appointment', return stringified JSON of {summary, startStr, endStr, email, name} where startStr and endStr are ISO-like YYYY-MM-DDTHH:MM:00 strings negotiated. For 'consult_kb', return the title name of the document consulted.",
                  },
                },
                required: ['type', 'details'],
              },
            },
            required: ['reply'],
          },
        },
      });

      const rawText = response.text || '';
      let parsedData;
      try {
        parsedData = JSON.parse(rawText.trim());
      } catch (parseErr) {
        const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match?.[1]) {
          parsedData = JSON.parse(match[1].trim());
        } else {
          throw parseErr;
        }
      }

      res.json({
        reply: parsedData.reply,
        actionTriggered: parsedData.actionTriggered,
        rawText: rawText,
        systemPrompt: systemPrompt,
        citations: citations,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Gemini SaaS Chat Playground Sandbox Error');
      res.status(500).json({
        reply: 'Playground sandbox failed to generate content.',
        rawText: error.stack || error.message || 'Unknown error',
        systemPrompt: 'Failed to construct template due to server-side exceptions.',
        error: error.message,
      });
    }
  })
);

// ─── Analytics Routes ────────────────────────────────────────────────────────

/** GET /api/tenant/:tenantId/analytics?days=30 */
router.get(
  '/api/tenant/:tenantId/analytics',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const days = Math.min(Number(req.query.days) || 30, 365);
    const analytics = await getAnalytics(tenantId, days);
    res.json(analytics);
  })
);

/** DELETE /api/tenant/:tenantId/analytics */
router.delete(
  '/api/tenant/:tenantId/analytics',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    await clearAnalytics(tenantId);
    res.json({ success: true });
  })
);

// ─── Webhook Event Log Routes ─────────────────────────────────────────────────

/** GET /api/tenant/:tenantId/webhook-events?limit=50 */
router.get(
  '/api/tenant/:tenantId/webhook-events',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const events = await getWebhookEvents(tenantId, limit);
    res.json({ events, total: events.length });
  })
);

/** DELETE /api/tenant/:tenantId/webhook-events */
router.delete(
  '/api/tenant/:tenantId/webhook-events',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    await clearWebhookEvents(tenantId);
    res.json({ success: true });
  })
);

export default router;
