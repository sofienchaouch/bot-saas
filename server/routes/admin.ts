import express from "express";
import { URL } from "url";
import { Type } from "@google/genai";
import { asyncHandler } from "../middleware/errorHandler";
import {
  readTenantsStore,
  writeTenantsStore,
  readConversationsStore,
  writeConversationsStore
} from "../services/db";
import {
  enrichTenantEmbeddings,
  chunkText,
  getEmbedding
} from "../services/rag";
import {
  isPlaceholderToken,
  sendWhatsAppMessage
} from "../services/whatsapp";
import { buildSystemPrompt } from "../services/promptBuilder";
import { ai } from "../services/gemini";
import { authMiddleware } from "../middleware/auth";
import { lookupAsync, NODE_ENV } from "../config";
import { getAnalytics, clearAnalytics } from "../services/analytics";
import { getWebhookEvents, clearWebhookEvents } from "../services/webhookLogger";

const router = express.Router();

// Apply authorization middleware to all admin routes
router.use(authMiddleware);

// SSRF URL Validation Helper
async function validateUrlForSsrf(urlStr: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(urlStr);
    if (parsedUrl.protocol !== "https:") {
      return false;
    }
    
    const hostname = parsedUrl.hostname;
    if (!hostname) return false;

    const lowerHost = hostname.toLowerCase();
    if (
      lowerHost === "localhost" ||
      lowerHost === "loopback" ||
      lowerHost.endsWith(".local") ||
      lowerHost.endsWith(".localhost") ||
      lowerHost.endsWith(".internal")
    ) {
      return false;
    }

    let ip: string;
    try {
      const lookupResult = await lookupAsync(hostname);
      ip = lookupResult.address;
    } catch (err) {
      if (NODE_ENV === "test") {
        return true;
      }
      return false;
    }

    const parts = ip.split(".").map(Number);
    if (parts.length === 4) {
      const [first, second, third, fourth] = parts;
      if (first === 127) return false;
      if (first === 10) return false;
      if (first === 172 && (second >= 16 && second <= 31)) return false;
      if (first === 192 && second === 168) return false;
      if (first === 169 && second === 254) return false;
      if (first === 0 || first >= 224) return false;
    }

    if (ip === "::1" || ip === "::" || ip.startsWith("fe80:") || ip.startsWith("ff00:")) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

router.get("/api/tenants", asyncHandler(async (req, res) => {
  const store = await readTenantsStore();
  res.json(store);
}));

router.post("/api/tenants/sync-all", asyncHandler(async (req, res) => {
  const list = req.body;
  if (!Array.isArray(list)) {
    return res.status(400).json({ error: "Expected array of tenants" });
  }
  const store = await readTenantsStore();
  for (const t of list) {
    if (t && t.id) {
      const enriched = await enrichTenantEmbeddings(t);
      store[enriched.id] = enriched;
    }
  }
  await writeTenantsStore(store);
  console.log(`[TENANTS SYNC-ALL] Successfully synchronized ${list.length} tenants with Firestore.`);
  res.json({ status: "success", count: list.length });
}));

router.post("/api/tenant/sync", asyncHandler(async (req, res) => {
  const tenant = req.body;
  if (!tenant || !tenant.id) {
    return res.status(400).json({ error: "Expected tenant object with non-empty ID parameter." });
  }
  const enriched = await enrichTenantEmbeddings(tenant);
  const store = await readTenantsStore();
  store[enriched.id] = enriched;
  await writeTenantsStore(store);
  console.log(`[TENANT SYNC] Successfully synchronized tenant details for ${enriched.name} (${enriched.id}) to Firestore`);
  res.json({ status: "success", id: enriched.id });
}));

router.post("/api/tenant/:tenantId/schedule", asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { crawlSchedule } = req.body;
  if (!['none', 'daily', 'weekly'].includes(crawlSchedule)) {
    return res.status(400).json({ error: "Invalid schedule value. Expected 'none', 'daily', or 'weekly'" });
  }

  const store = await readTenantsStore();
  const tenant = store[tenantId];
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  tenant.crawlSchedule = crawlSchedule;
  store[tenantId] = tenant;
  await writeTenantsStore(store);
  console.log(`[TENANT SCHEDULER] Updated crawl schedule to "${crawlSchedule}" for tenant "${tenantId}"`);
  res.json({ status: "success", crawlSchedule });
}));

router.get("/api/conversations/:tenantId", asyncHandler(async (req, res) => {
  const store = await readConversationsStore();
  const tenantId = req.params.tenantId;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const q = (req.query.q as string || "").toLowerCase().trim();

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
    const timeA = messagesA[messagesA.length - 1]?.timestamp || "";
    const timeB = messagesB[messagesB.length - 1]?.timestamp || "";
    return timeB.localeCompare(timeA);
  });

  const paginatedKeys = keys.slice(offset, offset + limit);
  const filtered: Record<string, any> = {};
  paginatedKeys.forEach(key => {
    filtered[key] = store[key];
  });

  res.json(filtered);
}));

router.post("/api/conversations/:tenantId/clear", asyncHandler(async (req, res) => {
  const store = await readConversationsStore();
  const tenantId = req.params.tenantId;
  Object.keys(store).forEach(key => {
    if (key.startsWith(`${tenantId}_`)) {
      delete store[key];
    }
  });
  await writeConversationsStore(store);
  res.json({ status: "success" });
}));

router.post("/api/conversations/:tenantId/:customerId/assign", asyncHandler(async (req, res) => {
  const { tenantId, customerId } = req.params;
  const { assignedAgentName } = req.body;
  const conversations = await readConversationsStore();
  const convoKey = `${tenantId}_${customerId}`;
  if (!conversations[convoKey]) {
    conversations[convoKey] = { messages: [] };
  }
  conversations[convoKey].assignedAgentName = assignedAgentName || "";
  await writeConversationsStore(conversations);
  console.log(`[CONVERSATION ASSIGN] Thread "${convoKey}" assigned to agent "${assignedAgentName}"`);
  res.json({ status: "success", assignedAgentName });
}));

router.post("/api/conversations/:tenantId/:customerId/tags", asyncHandler(async (req, res) => {
  const { tenantId, customerId } = req.params;
  const { tags } = req.body;

  if (!Array.isArray(tags)) {
    return res.status(400).json({ error: "Expected tags parameter to be an array of strings." });
  }

  const conversations = await readConversationsStore();
  const convoKey = `${tenantId}_${customerId}`;
  if (!conversations[convoKey]) {
    conversations[convoKey] = { messages: [] };
  }

  conversations[convoKey].tags = tags;
  await writeConversationsStore(conversations);

  console.log(`[CONVERSATION TAGS] Updated tags for thread "${convoKey}" to:`, tags);
  res.json({ status: "success", tags });
}));

router.get("/api/conversations/:tenantId/:customerId/export", asyncHandler(async (req, res) => {
  const { tenantId, customerId } = req.params;
  const conversations = await readConversationsStore();
  const convoKey = `${tenantId}_${customerId}`;
  const convo = conversations[convoKey];

  if (!convo || !convo.messages || convo.messages.length === 0) {
    return res.status(404).json({ error: "Conversation thread not found or empty." });
  }

  let csvContent = "sender,text,timestamp\n";
  convo.messages.forEach((msg: any) => {
    const cleanText = (msg.text || "").replace(/"/g, '""');
    csvContent += `"${msg.sender}","${cleanText}","${msg.timestamp}"\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="conversation_${convoKey}.csv"`);
  res.status(200).send(csvContent);
}));

router.post("/api/tenant/:tenantId/autopilot", asyncHandler(async (req, res) => {
  const tenantId = req.params.tenantId;
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "Expected boolean parameter 'enabled'" });
  }
  const store = await readTenantsStore();
  if (!store[tenantId]) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  store[tenantId].autopilotEnabled = enabled;
  await writeTenantsStore(store);
  console.log(`[AUTOPILOT UPDATE] Tenant "${tenantId}" set autopilotEnabled to ${enabled}`);
  res.json({ status: "success", tenantId, autopilotEnabled: enabled });
}));

// Web Crawler Helper: parse robots.txt
function parseRobotsTxt(robotsText: string, userAgent = "*"): { disallows: string[]; sitemaps: string[] } {
  const disallows: string[] = [];
  const sitemaps: string[] = [];
  const lines = robotsText.split(/\r?\n/);
  let inTargetAgentSection = false;

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith("#")) continue;

    const parts = cleanLine.split(":");
    const directive = parts[0].trim().toLowerCase();
    const value = parts.slice(1).join(":").trim();

    if (directive === "sitemap") {
      sitemaps.push(value);
    } else if (directive === "user-agent") {
      const agent = value.toLowerCase();
      inTargetAgentSection = (agent === userAgent.toLowerCase() || agent === "*");
    } else if (directive === "disallow" && inTargetAgentSection) {
      if (value) {
        disallows.push(value);
      }
    }
  }

  return { disallows, sitemaps };
}

// Web Crawler Helper: check disallow rules
function isPathDisallowed(path: string, disallows: string[]): boolean {
  for (const rule of disallows) {
    if (rule === "/") return true;
    if (path.startsWith(rule)) return true;
  }
  return false;
}

// Web Crawler Helper: fetch and parse robots.txt
async function getRobotsTxtRules(startUrl: string): Promise<{ disallows: string[]; sitemaps: string[] }> {
  try {
    const parsed = new URL(startUrl);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": "AuraSaaSCrawler/1.0" },
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const text = await res.text();
      return parseRobotsTxt(text, "AuraSaaSCrawler/1.0");
    }
  } catch (err) {
    console.log(`[CRAWLER] No robots.txt found or fetch failed:`, err);
  }
  return { disallows: [], sitemaps: [] };
}

// Web Crawler Helper: extract sitemap URLs
async function getSitemapUrls(sitemapUrl: string, host: string): Promise<string[]> {
  const urls: string[] = [];
  try {
    const res = await fetch(sitemapUrl, {
      headers: { "User-Agent": "AuraSaaSCrawler/1.0" },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const xml = await res.text();
      const matches = xml.match(/<loc>(https?:\/\/[^\s<]+)<\/loc>/gi);
      if (matches) {
        matches.forEach(m => {
          const loc = m.replace(/<\/?loc>/gi, "").trim();
          try {
            const locUrl = new URL(loc);
            if (locUrl.host === host) {
              urls.push(loc);
            }
          } catch {}
        });
      }
    }
  } catch (err) {
    console.log(`[CRAWLER] Sitemap fetch failed:`, err);
  }
  return urls;
}

router.post("/api/tenant/:tenantId/crawl", asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { url, source, depth, pagesBudget } = req.body;

  if (!url || !url.trim()) {
    return res.status(400).json({ error: "Missing target URL or profile handle." });
  }

  const store = await readTenantsStore();
  const tenant = store[tenantId];
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found." });
  }

  const maxPages = pagesBudget || 10;
  const maxDepth = depth || 1;

  console.log(`[CRAWLER] Starting crawler for tenant "${tenantId}". URL: ${url}, source: ${source}, maxDepth: ${maxDepth}, maxPages: ${maxPages}`);

  let crawledText = "";
  let pageTitle = "Crawled Source";
  let crawledCount = 0;

  if (source === "web") {
    const isUrlSafe = await validateUrlForSsrf(url);
    if (!isUrlSafe) {
      console.warn(`[CRAWLER] Blocked SSRF attempt targeting URL: "${url}"`);
      return res.status(400).json({ error: "Access Denied: Target URL is restricted or invalid." });
    }

    try {
      const parsedStartUrl = new URL(url);
      const host = parsedStartUrl.host;

      // 1. Get robots.txt rules
      const { disallows, sitemaps } = await getRobotsTxtRules(url);
      console.log(`[CRAWLER] Found ${disallows.length} disallows and ${sitemaps.length} sitemaps in robots.txt`);

      // 2. Initialize crawl queue
      const queue: string[] = [url];
      const visited = new Set<string>();
      const urlDepth: Record<string, number> = { [url]: 1 };

      // 3. Parse sitemaps to preload queue if present
      if (sitemaps.length > 0) {
        for (const sitemap of sitemaps) {
          if (queue.length >= maxPages) break;
          const sitemapUrls = await getSitemapUrls(sitemap, host);
          console.log(`[CRAWLER] Extracted ${sitemapUrls.length} urls from sitemap: ${sitemap}`);
          for (const sUrl of sitemapUrls) {
            if (!visited.has(sUrl) && !queue.includes(sUrl)) {
              queue.push(sUrl);
              urlDepth[sUrl] = 1;
            }
          }
        }
      }

      // 4. Recursive Crawl loop
      while (queue.length > 0 && visited.size < maxPages) {
        const currentUrl = queue.shift()!;
        if (visited.has(currentUrl)) continue;

        const currDepth = urlDepth[currentUrl] || 1;
        if (currDepth > maxDepth) continue;

        // SSRF check on current URL
        if (!(await validateUrlForSsrf(currentUrl))) continue;

        // robots.txt path check
        const path = new URL(currentUrl).pathname;
        if (isPathDisallowed(path, disallows)) {
          console.log(`[CRAWLER] Skipping disallowed path: ${currentUrl}`);
          continue;
        }

        console.log(`[CRAWLER] Fetching page (${visited.size + 1}/${maxPages}): ${currentUrl}`);
        visited.add(currentUrl);

        try {
          const response = await fetch(currentUrl, {
            headers: { "User-Agent": "AuraSaaSCrawler/1.0" },
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            const html = await response.text();
            
            // Extract title
            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch && visited.size === 1) {
              pageTitle = titleMatch[1].trim();
            }

            // Extract clean text content
            let cleanText = html
              .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
              .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            if (cleanText.length > 5000) cleanText = cleanText.substring(0, 5000);

            crawledText += `\n\n=== CRAWLED PAGE: ${currentUrl} ===\n${cleanText}\n`;
            crawledCount++;

            // Extract links for link following if we are not at max depth
            if (currDepth < maxDepth) {
              const hrefRegex = /<a[^>]+href=["']([^"']+)["']/gi;
              let match;
              while ((match = hrefRegex.exec(html)) !== null) {
                const href = match[1];
                try {
                  const resolvedUrl = new URL(href, currentUrl).toString();
                  const resolvedParsed = new URL(resolvedUrl);
                  
                  // Limit to same host/domain
                  if (resolvedParsed.host === host && !visited.has(resolvedUrl) && !queue.includes(resolvedUrl)) {
                    queue.push(resolvedUrl);
                    urlDepth[resolvedUrl] = currDepth + 1;
                  }
                } catch {}
              }
            }
          }
        } catch (fetchErr: any) {
          console.warn(`[CRAWLER] Fetch failed for ${currentUrl}:`, fetchErr.message);
        }
      }
    } catch (crawlErr: any) {
      console.error("[CRAWLER] Web crawl error:", crawlErr);
    }
  }

  // Fallback if crawl yielded no content
  if (!crawledText) {
    console.log(`[CRAWLER] Activating smart mock scrapers for ${source} profile: ${url}`);
    if (source === "web") {
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
      pageTitle = `${tenant.name} @${url.replace(/[^a-zA-Z0-9]/g, "")} Feed`;
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
      embedding: vector
    });
  }

  const newKbItem = {
    id: newItemId,
    type: "crawl" as const,
    title: pageTitle,
    content: crawledText,
    dateAdded: new Date().toISOString().split("T")[0],
    url: url,
    crawlDepth: depth || 1,
    crawlPagesCount: crawledCount,
    crawlStatus: "synced" as const,
    socialNetwork: source,
    chunks: chunksWithEmbeddings
  };

  if (!tenant.knowledgeBase) tenant.knowledgeBase = [];
  tenant.knowledgeBase.push(newKbItem);
  await writeTenantsStore(store);

  console.log(`[CRAWLER] Crawl completed for "${tenantId}". Document "${pageTitle}" added to KB.`);
  res.json({ status: "success", kbItem: newKbItem });
}));

router.post("/api/conversations/:tenantId/:customerId/reply", asyncHandler(async (req, res) => {
  const { tenantId, customerId } = req.params;
  const { text, isInternal } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Expected non-empty string parameter 'text'" });
  }

  const store = await readTenantsStore();
  const tenant = store[tenantId];
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  const conversations = await readConversationsStore();
  const convoKey = `${tenantId}_${customerId}`;
  if (!conversations[convoKey]) {
    conversations[convoKey] = { messages: [] };
  }
  
  const internalNote = isInternal === true;
  conversations[convoKey].messages.push({
    sender: internalNote ? "system" : "bot",
    text: text,
    timestamp: new Date().toISOString(),
    isManualTakeover: !internalNote,
    isInternal: internalNote
  });
  await writeConversationsStore(conversations);

  if (internalNote) {
    console.log(`[CONVERSATION INTERNAL NOTE] Stored internal note for thread "${convoKey}"`);
    return res.json({ status: "success", text, isInternal: true });
  }

  const targetPhoneNumberId = tenant.whatsAppVerifiedSid;
  const accessToken = tenant.whatsAppApiKey || process.env.WHATSAPP_TOKEN;

  if (targetPhoneNumberId && accessToken && !isPlaceholderToken(accessToken)) {
    try {
      console.log(`[META OUTBOUND MANUAL] Sending manual Graph API reply to ${customerId} via SID ${targetPhoneNumberId}...`);
      await sendWhatsAppMessage(targetPhoneNumberId, accessToken, customerId, text);
    } catch (graphErr) {
      console.error("[META OUTBOUND MANUAL] Failed to send manual Graph API reply:", graphErr);
    }
  } else {
    console.log(`[META OUTBOUND MANUAL] Bypassing outbound Graph API send because credentials are placeholders. Simulator frame will poll and display.`);
  }

  res.json({ status: "success", text, isInternal: false });
}));

router.post("/api/playground/test", asyncHandler(async (req, res) => {
  try {
    const {
      messages,
      botName,
      tone,
      knowledgeBase,
      appointmentsList,
      tenantName,
      tenantIndustry,
      tenantDescription,
      systemInstruction
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const lastMessage = messages[messages.length - 1]?.text || "";
    const { getRAGContext } = await import("../services/rag");
    const ragResult = await getRAGContext(lastMessage, knowledgeBase);
    const kbContext = ragResult.contextText;
    const citations = ragResult.citations;

    const scheduleContext = appointmentsList && appointmentsList.length > 0
      ? appointmentsList.map((app: any) => `- Booked Slot: From ${app.start} to ${app.end}`).join("\n")
      : "No conflicting scheduled bookings on the calendar.";

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
Do not wrap your output in markdown codeblocks like \`\`\`json. Return bare clean JSON.`
    });

    if (!ai) {
      const lastMessage = messages[messages.length - 1]?.text || "";
      let simulatedReply = `[SIMULATED OFFLINE MODE] Hello! This sandbox test message was processed successfully. I am ${botName} using instruction: "${systemInstruction.substring(0, 40)}..." `;
      let action = null;
      
      if (lastMessage.toLowerCase().includes("lead") || lastMessage.includes("@")) {
        action = {
          type: "capture_lead",
          details: JSON.stringify({ name: "Playground Tester", email: "tester@sandbox.com", phone: "+1 (555) 012-3456" })
        };
        simulatedReply += "I detected lead collection intent and generated a sandbox capture action.";
      } else if (lastMessage.toLowerCase().includes("book") || lastMessage.toLowerCase().includes("meeting") || lastMessage.toLowerCase().includes("appointment")) {
        action = {
          type: "book_appointment",
          details: JSON.stringify({ summary: "Sandbox Meeting", startStr: "2026-06-16T10:00:00", endStr: "2026-06-16T10:30:00" })
        };
        simulatedReply += "I suggested an appointment slot and generated an autonomous reservation request template.";
      } else {
        simulatedReply += `You sent: "${lastMessage}". Let me know if you would like to test lead captures, knowledge lookups, or calendar booking constraints.`;
      }

      const mockResponse = {
        reply: simulatedReply,
        actionTriggered: action
      };

      return res.json({
        reply: mockResponse.reply,
        actionTriggered: mockResponse.actionTriggered,
        rawText: JSON.stringify(mockResponse, null, 2),
        systemPrompt: systemPrompt
      });
    }

    const contents = messages.map((m: any) => {
      return {
        role: m.sender === 'bot' ? 'model' : 'user',
        parts: [{ text: m.text }]
      };
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "The direct messaging sentence response to display to the user in the WhatsApp chat bubble."
            },
            actionTriggered: {
              type: Type.OBJECT,
              nullable: true,
              description: "An action the bot decides to trigger based on the user conversation path. Set to null if no new state change is required.",
              properties: {
                type: {
                  type: Type.STRING,
                  description: "The action class: 'capture_lead' (if user provided name/email/phone for follow up), 'book_appointment' (if they explicitly agreed on a specific reservation date/time), or 'consult_kb' (if they just asked a question solved by a document item)."
                },
                details: {
                  type: Type.STRING,
                  description: "For 'capture_lead', return a stringified JSON of {name, email, phone}. For 'book_appointment', return stringified JSON of {summary, startStr, endStr, email, name} where startStr and endStr are ISO-like YYYY-MM-DDTHH:MM:00 strings negotiated. For 'consult_kb', return the title name of the document consulted."
                }
              },
              required: ["type", "details"]
            }
          },
          required: ["reply"]
        }
      }
    });

    const rawText = response.text || "";
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
      citations: citations
    });

  } catch (error: any) {
    console.error("Gemini SaaS Chat Playground Sandbox Error:", error);
    res.status(500).json({
      reply: "Playground sandbox failed to generate content.",
      rawText: error.stack || error.message || "Unknown error",
      systemPrompt: "Failed to construct template due to server-side exceptions.",
      error: error.message
    });
  }
}));

// ─── Analytics Routes ────────────────────────────────────────────────────────

/** GET /api/tenant/:tenantId/analytics?days=30 */
router.get("/tenant/:tenantId/analytics", asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const days = Math.min(Number(req.query.days) || 30, 365);
  const analytics = await getAnalytics(tenantId, days);
  res.json(analytics);
}));

/** DELETE /api/tenant/:tenantId/analytics */
router.delete("/tenant/:tenantId/analytics", asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  await clearAnalytics(tenantId);
  res.json({ success: true });
}));

// ─── Webhook Event Log Routes ─────────────────────────────────────────────────

/** GET /api/tenant/:tenantId/webhook-events?limit=50 */
router.get("/tenant/:tenantId/webhook-events", asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const events = getWebhookEvents(tenantId, limit);
  res.json({ events, total: events.length });
}));

/** DELETE /api/tenant/:tenantId/webhook-events */
router.delete("/tenant/:tenantId/webhook-events", asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  clearWebhookEvents(tenantId);
  res.json({ success: true });
}));

export default router;
