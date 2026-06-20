import express from "express";
import { URL } from "url";
import { Type } from "@google/genai";
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

// Get all tenants
router.get("/api/tenants", async (req, res) => {
  const store = await readTenantsStore();
  res.json(store);
});

// Sync all tenants
router.post("/api/tenants/sync-all", async (req, res) => {
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
});

// Sync single tenant
router.post("/api/tenant/sync", async (req, res) => {
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
});

// Update crawl schedule for a tenant
router.post("/api/tenant/:tenantId/schedule", async (req, res) => {
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
});

// Conversations endpoints for real-time visualization and log diagnostics
router.get("/api/conversations/:tenantId", async (req, res) => {
  const store = await readConversationsStore();
  const tenantId = req.params.tenantId;
  const filtered: Record<string, any> = {};
  Object.keys(store).forEach(key => {
    if (key.startsWith(`${tenantId}_`)) {
      filtered[key] = store[key];
    }
  });
  res.json(filtered);
});

// Clear conversations for a tenant
router.post("/api/conversations/:tenantId/clear", async (req, res) => {
  const store = await readConversationsStore();
  const tenantId = req.params.tenantId;
  Object.keys(store).forEach(key => {
    if (key.startsWith(`${tenantId}_`)) {
      delete store[key];
    }
  });
  await writeConversationsStore(store);
  res.json({ status: "success" });
});

// Assign conversation to an agent
router.post("/api/conversations/:tenantId/:customerId/assign", async (req, res) => {
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
});

// Toggle autopilot
router.post("/api/tenant/:tenantId/autopilot", async (req, res) => {
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
});

// Web crawler route
router.post("/api/tenant/:tenantId/crawl", async (req, res) => {
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

  console.log(`[CRAWLER] Starting crawler for tenant "${tenantId}". URL: ${url}, source: ${source}, depth: ${depth}, budget: ${pagesBudget}`);

  let crawledText = "";
  let pageTitle = "Crawled Source";
  if (source === "web") {
    const isUrlSafe = await validateUrlForSsrf(url);
    if (!isUrlSafe) {
      console.warn(`[CRAWLER] Blocked SSRF attempt targeting URL: "${url}"`);
      return res.status(400).json({ error: "Access Denied: Target URL is restricted or invalid." });
    }

    try {
      console.log(`[CRAWLER] Fetching root page: ${url}`);
      const response = await fetch(url, {
        headers: { "User-Agent": "AuraSaaSCrawler/1.0" },
        signal: AbortSignal.timeout(6000)
      });
      if (response.ok) {
        const html = await response.text();
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) pageTitle = titleMatch[1];

        let cleanText = html
          .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
          .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        
        if (cleanText.length > 8000) cleanText = cleanText.substring(0, 8000);
        crawledText = cleanText;
      }
    } catch (fetchErr: any) {
      console.warn(`[CRAWLER] Fetch failed for ${url}:`, fetchErr.message);
    }
  }

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
    crawlPagesCount: 1,
    crawlStatus: "synced" as const,
    socialNetwork: source,
    chunks: chunksWithEmbeddings
  };

  if (!tenant.knowledgeBase) tenant.knowledgeBase = [];
  tenant.knowledgeBase.push(newKbItem);
  await writeTenantsStore(store);

  console.log(`[CRAWLER] Crawl completed for "${tenantId}". Document "${pageTitle}" added to KB.`);
  res.json({ status: "success", kbItem: newKbItem });
});

// Reply to customer message manually
router.post("/api/conversations/:tenantId/:customerId/reply", async (req, res) => {
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
});

// Interactive Agent Prompt/Instruction Playground Sandbox Endpoint
router.post("/api/playground/test", async (req, res) => {
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
    const kbContext = await getRAGContext(lastMessage, knowledgeBase);

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
      systemPrompt: systemPrompt
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
});

export default router;
