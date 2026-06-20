import express from "express";
import crypto from "crypto";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { Type } from "@google/genai";
import {
  readTenantsStore,
  writeTenantsStore,
  readConversationsStore,
  writeConversationsStore
} from "../services/db";
import { getRAGContext } from "../services/rag";
import { isPlaceholderToken, sendWhatsAppMessage } from "../services/whatsapp";
import { buildSystemPrompt } from "../services/promptBuilder";
import { ai } from "../services/gemini";
import { WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET } from "../config";
import { recordEvent } from "../services/analytics";
import { logWebhookEvent } from "../services/webhookLogger";

const verifyMetaSignature = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const signature = req.headers["x-hub-signature-256"] as string;

  if (!signature) {
    logger.warn("[META WEBHOOK] Missing X-Hub-Signature-256 header.");
    return res.status(401).send("Unauthorized: Missing X-Hub-Signature-256 signature.");
  }

  const parts = signature.split("=");
  const expectedHash = parts[1];
  
  if (!expectedHash) {
    logger.warn("[META WEBHOOK] Invalid signature format.");
    return res.status(400).send("Bad Request: Invalid X-Hub-Signature-256 signature format.");
  }

  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    logger.warn("[META WEBHOOK] Raw request body buffer is missing.");
    return res.status(400).send("Bad Request: Raw body not available for signature check.");
  }

  const hmac = crypto.createHmac("sha256", WHATSAPP_APP_SECRET);
  hmac.update(rawBody);
  const actualHash = hmac.digest("hex");

  if (actualHash !== expectedHash) {
    logger.warn({ expectedHash, actualHash }, "[META WEBHOOK] Signature verification failed");
    return res.status(403).send("Forbidden: Webhook signature verification failed.");
  }

  next();
};

const router = express.Router();

// Meta's WhatsApp Webhook Verification Endpoint (GET)
// Used when adding and verifying webhooks in developers.facebook.com
router.get([
  "/api/webhook",
  "/api/webhook/:tenantId",
  "/v1/whatsapp/webhook",
  "/v1/whatsapp/webhook/:tenantId"
], (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const tenantId = req.params.tenantId;

  const SECRET_VERIFY_TOKEN = WHATSAPP_VERIFY_TOKEN;

  logger.info({ mode, token, tenantId }, "[META WEBHOOK] Received GET verification handshake");

  if (mode && token) {
    // Support strict verification checks:
    // 1. Secret WHATSAPP_VERIFY_TOKEN from env validation
    // 2. The dynamically rendered client verification token: "verify_token_omnibot_" + tenantId
    const isTokenValid = 
      token === SECRET_VERIFY_TOKEN ||
      (tenantId && token === `verify_token_omnibot_${tenantId}`);

    if (mode === "subscribe" && isTokenValid) {
      logger.info({ challenge }, "[META WEBHOOK] Verification status: APPROVED. Challenge returned");
      res.setHeader("Content-Type", "text/plain");
      return res.status(200).send(challenge);
    } else {
      logger.warn({ token }, "[META WEBHOOK] Verification status: DENIED. Token mismatch");
      return res.status(403).send("Forbidden: Verify token mismatch or mode unsupported.");
    }
  }

  // Fallback for random query hits
  return res.status(400).send("No hub verification parameters present.");
});

// Meta's WhatsApp Webhook Message Receiver Endpoint (POST)
// Receives actual inbound client messages from users in real-time
router.post([
  "/api/webhook",
  "/api/webhook/:tenantId",
  "/v1/whatsapp/webhook",
  "/v1/whatsapp/webhook/:tenantId"
], verifyMetaSignature, asyncHandler(async (req, res) => {
  try {
    const payload = req.body;
    logger.info({ payload }, "[META WEBHOOK] Received WhatsApp cloud payload");

    // Resolve tenant to check quota before acknowledging receipt
    let tenantId = req.params.tenantId || "zenith-fitness";
    const store = await readTenantsStore();
    let tenant = store[tenantId];

    if (!tenant) {
      if (payload.object === "page") {
        const entry = payload.entry?.[0];
        const pageId = entry?.id;
        const foundKey = Object.keys(store).find(k => store[k].messengerPageId === pageId);
        if (foundKey) {
          tenantId = foundKey;
          tenant = store[foundKey];
        }
      } else if (payload.object === "whatsapp_business_account") {
        const entry = payload.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];
        const from = message?.from;
        const foundKey = Object.keys(store).find(k => {
          const t = store[k];
          const cleanT = t.whatsAppPhoneNumber?.replace(/[^0-9]/g, "");
          const cleanFrom = from?.replace(/[^0-9]/g, "");
          return cleanT && cleanFrom && (cleanT.includes(cleanFrom) || cleanFrom.includes(cleanT));
        });
        if (foundKey) {
          tenantId = foundKey;
          tenant = store[foundKey];
        }
      }
    }

    if (tenant) {
      const tier = tenant.subscriptionTier || "Free";
      const count = tenant.messageCount || 0;
      let isOverQuota = false;
      if (tier === "Free" && count >= 50) isOverQuota = true;
      else if (tier === "Starter" && count >= 500) isOverQuota = true;
      else if (tier === "Business" && count >= 5000) isOverQuota = true;

      if (isOverQuota) {
        logger.warn({ tenantId, count, tier }, "[META WEBHOOK] Tenant is over quota. Rejecting message");
        return res.status(403).json({ error: "Quota Exceeded. Please upgrade your subscription plan." });
      }
    }

    // Acknowledge receipt of the webhook event IMMEDIATELY with a 200 status as requested by Facebook
    res.status(200).json({ status: "received" });

    // Extract message data if present from Facebook Messenger Page Webhook (Simulated/Graph API)
    if (payload.object === "page") {
      const entry = payload.entry?.[0];
      const messaging = entry?.messaging?.[0];
      const message = messaging?.message;

      if (message) {
        const from = messaging.sender?.id || "unknown_psid"; // Sender PSID
        const textBody = message.text || "";
        const isAudio = message.isAudio || false;
        const senderName = req.query.sender_name || "Facebook Customer";

        logger.info({ senderName, from, textBody }, "[META MESSENGER HOOK] Inbound FB Messenger message");
        
        let tenantId = req.params.tenantId || "zenith-fitness";
        const store = await readTenantsStore();
        let tenant = store[tenantId];
        
        if (!tenant) {
          // Attempt metadata lookup
          const pageId = entry?.id;
          const foundKey = Object.keys(store).find(k => {
            const t = store[k];
            return t.messengerPageId === pageId;
          });
          if (foundKey) {
            tenantId = foundKey;
            tenant = store[foundKey];
          } else {
            tenantId = "zenith-fitness";
            tenant = store[tenantId];
          }
        }

        if (!tenant) {
          logger.warn({ tenantId }, "[META MESSENGER HOOK] Bypassing because no active tenant matches ID");
          return;
        }

        // Fetch conversation thread history
        const conversations = await readConversationsStore();
        const convoKey = `${tenantId}_${from}`;
        if (!conversations[convoKey]) {
          conversations[convoKey] = { messages: [] };
        }

        conversations[convoKey].messages.push({
          sender: "customer",
          text: textBody,
          timestamp: new Date().toISOString(),
          isAudio: isAudio
        });

        if (conversations[convoKey].messages.length > 20) {
          conversations[convoKey].messages = conversations[convoKey].messages.slice(-20);
        }

        const botName = tenant.botName || "Assistant";
        const tone = tenant.tone || "friendly";
        const appointmentsList = tenant.appointments || [];
        const tenantName = tenant.name || "Our Business";
        const tenantIndustry = tenant.industry || "General Services";
        const tenantDescription = tenant.description || "";
        const systemInstruction = tenant.systemInstruction || "";

        const ragResult = await getRAGContext(textBody, tenantId);
        const kbContext = ragResult.contextText;
        const citations = ragResult.citations;

        const scheduleContext = appointmentsList && appointmentsList.length > 0
          ? appointmentsList.map((app: any) => `- Booked Slot: From ${app.start} to ${app.end}`).join("\n")
          : "No conflicting scheduled bookings on the calendar.";

        const systemPrompt = buildSystemPrompt({
          channel: `Facebook Messenger AI Bot representing the tenant "${tenantName}" (${tenantIndustry})`,
          tenantName,
          tenantIndustry,
          botName,
          tone,
          tenantDescription,
          systemInstruction,
          kbContext,
          scheduleContext,
          additionalRules: `\n\nYour direct objectives in the continuous chat are:
1. Greet the customer and answer their questions beautifully and concisely (Messenger messages should remain under 3-4 neat sentences, using clean whitespace and occasional emojis if casual).
2. Lead Capture: If the customer shows genuine client/buyer interest (e.g., requests quotes, pricing, callbacks, custom designs) and provides or agrees to provide their name, email, or telephone, trigger a 'capture_lead' action.
3. Appointment Booking: If they express the explicit intent to book a meeting, look at the calendar busy slots above, suggest an unoccupied time slot (within normal business hours 9am - 5pm, from Monday to Friday), and if they agree to a specific date/time, trigger a 'book_appointment' action.

Your response MUST be returned strictly in JSON format matching the schema requested below.
Do not wrap your output in markdown codeblocks like \`\`\`json. Return bare clean JSON.`
        });

        const contents = conversations[convoKey].messages.map((m: any) => {
          return {
            role: m.sender === 'bot' ? 'model' : 'user',
            parts: [{ text: m.text }]
          };
        });

        const autopilot = tenant.autopilotEnabled !== false;

        if (autopilot) {
          const currentAi = ai;
          let botReply = `Hello! Thanks for writing to us via Facebook Messenger. I am ${botName}, your helper. How can I assist you?`;
          let actionTriggered = null;

          if (currentAi) {
            try {
              logger.info({ from }, "[META MESSENGER AI] Generating response for sender PSID");
              const response = await currentAi.models.generateContent({
                model: "gemini-2.0-flash",
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
                        description: "The direct messaging sentence response to display to the user in the Messenger chat bubble."
                      },
                      actionTriggered: {
                        type: Type.OBJECT,
                        nullable: true,
                        description: "An action the bot decides to trigger based on the user conversation path. Set to null if no new state change is required.",
                        properties: {
                          type: {
                            type: Type.STRING,
                            description: "The action class: 'capture_lead' or 'book_appointment' or 'consult_kb'"
                          },
                          details: {
                            type: Type.STRING,
                            description: "Stringified JSON of details mapping"
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
              } catch (pErr) {
                const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
                if (match?.[1]) {
                  parsedData = JSON.parse(match[1].trim());
                } else {
                  throw pErr;
                }
              }

              if (parsedData?.reply) {
                botReply = parsedData.reply;
                actionTriggered = parsedData.actionTriggered;
              }
            } catch (aiErr) {
              logger.error({ err: aiErr }, "[META MESSENGER AI] Gemini generation error");
            }
          }

          if (actionTriggered) {
            logger.info({ action: actionTriggered }, "[META MESSENGER AI] Decided action");
            try {
              const actDetails = JSON.parse(actionTriggered.details || "{}");
              let tenantModified = false;

              if (actionTriggered.type === 'capture_lead') {
                const newLead = {
                  id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  name: actDetails.name || senderName || "Messenger User",
                  phone: actDetails.phone || "Messenger Profile",
                  email: actDetails.email || "no-email@facebook-user.com",
                  status: 'New' as const,
                  dateCaptured: new Date().toISOString().split('T')[0],
                  note: "Captured autonomously via Facebook Messenger page thread."
                };
                if (!tenant.leads) tenant.leads = [];
                tenant.leads.push(newLead);
                tenantModified = true;
                logger.info({ lead: newLead }, "[META MESSENGER CRM] Captured Lead autonomously");
              } else if (actionTriggered.type === 'book_appointment') {
                const newAppt = {
                  id: `appt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  customerName: actDetails.name || senderName || "Messenger User",
                  customerPhone: actDetails.phone || "Messenger Profile",
                  email: actDetails.email || "no-email@facebook-user.com",
                  start: actDetails.startStr || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0] + "T10:00:00",
                  end: actDetails.endStr || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0] + "T10:30:00",
                  summary: actDetails.summary || `Autonomous Messenger Booking with ${botName}`,
                  notes: "Booked autonomously via Facebook Messenger page thread.",
                  syncedWithGoogle: false
                };
                if (!tenant.appointments) tenant.appointments = [];
                tenant.appointments.push(newAppt);
                tenantModified = true;
                logger.info({ appointment: newAppt }, "[META MESSENGER CALENDAR] Booked Appointment autonomously");
              } else if (actionTriggered.type === 'purchase_item') {
                if (!tenant.leads) tenant.leads = [];
                const matchedLeadIndex = tenant.leads.findIndex((l: any) => 
                  (actDetails.email && l.email && l.email.toLowerCase() === actDetails.email.toLowerCase()) ||
                  (actDetails.phone && l.phone === actDetails.phone) ||
                  (l.name.toLowerCase() === (actDetails.name || senderName || "").toLowerCase())
                );
                const orderDetails = actDetails.item || actDetails.details || "Product checkout";
                if (matchedLeadIndex > -1) {
                  tenant.leads[matchedLeadIndex].status = 'Qualified';
                  tenant.leads[matchedLeadIndex].note = `${tenant.leads[matchedLeadIndex].note || ""}\n🛒 Ordered: ${orderDetails} (Total: ${actDetails.price || "N/A"})`.trim();
                } else {
                  const newLead = {
                    id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    name: actDetails.name || senderName || "Shopping Buyer",
                    phone: actDetails.phone || "Messenger Profile",
                    email: actDetails.email || "shopping-buyer@gmail.com",
                    status: 'Qualified' as const,
                    dateCaptured: new Date().toISOString().split('T')[0],
                    note: `🛒 Autonomously placed purchase order: ${orderDetails} (Total: ${actDetails.price || "N/A"})`
                  };
                  tenant.leads.push(newLead);
                }
                tenantModified = true;
                logger.info({ orderDetails }, "[META MESSENGER CRM] E-Commerce Purchase registered autonomously");
              }

              tenant.messageCount = (tenant.messageCount || 0) + 1;
              tenantModified = true;

              if (tenantModified) {
                const storeWrite = await readTenantsStore();
                storeWrite[tenantId] = tenant;
                await writeTenantsStore(storeWrite);
              }
            } catch (actErr) {
              logger.error({ err: actErr }, "[META MESSENGER ACTION] Action error");
            }
          }

          // Save bot replies to conversations database
          conversations[convoKey].messages.push({
            sender: "bot",
            text: botReply,
            timestamp: new Date().toISOString(),
            isAudio: !!tenant.messengerVoiceEnabled,
            citations: citations
          });
          await writeConversationsStore(conversations);
        } else {
          logger.info({ tenantId }, "[META MESSENGER TAKEOVER] Autopilot is disabled for tenant. Session is in manual takeover mode.");
        }
      }
    }

    // Extract message data if present
    if (payload.object === "whatsapp_business_account") {
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      const contact = value?.contacts?.[0];
      const inboundAt = Date.now();

      if (message) {
        const from = message.from; // Phone number of the sender
        const textBody = message.text?.body || "";
        const senderName = contact?.profile?.name || "WhatsApp User";

        logger.info({ senderName, from, textBody }, "[META WEBHOOK] Inbound WhatsApp message");
        
        // Find matching tenantId
        let tenantId = req.params.tenantId || "zenith-fitness";
        
        // If we didn't receive a specific tenantId route parameter, let's see if we can locate it from the incoming business configuration
        const store = await readTenantsStore();
        let tenant = store[tenantId];
        
        if (!tenant) {
          // If not found, try to locate any tenant matching the WhatsApp phone number in the incoming hook, or use the first available
          const foundKey = Object.keys(store).find(k => {
            const t = store[k];
            const cleanT = t.whatsAppPhoneNumber?.replace(/[^0-9]/g, "");
            const cleanFrom = from?.replace(/[^0-9]/g, "");
            return cleanT && cleanFrom && (cleanT.includes(cleanFrom) || cleanFrom.includes(cleanT));
          });
          if (foundKey) {
            tenantId = foundKey;
            tenant = store[foundKey];
          } else {
            // Resort to default primary zenith-fitness tenant
            tenantId = "zenith-fitness";
            tenant = store[tenantId];
          }
        }

        if (!tenant) {
          logger.warn({ tenantId }, "[META WEBHOOK LOG] Bypassing answer hook because no active tenant matches ID");
          return;
        }

        // Load conversation history for this sender
        const conversations = await readConversationsStore();
        const convoKey = `${tenantId}_${from}`;
        if (!conversations[convoKey]) {
          conversations[convoKey] = { messages: [] };
        }

        // Add user user's message to conversation trace
        conversations[convoKey].messages.push({
          sender: "customer",
          text: textBody,
          timestamp: new Date().toISOString()
        });

        // Record inbound analytics + log
        recordEvent(tenantId, "message_received", "whatsapp", { senderPhone: from });
        logWebhookEvent(tenantId, {
          channel: "whatsapp",
          direction: "inbound",
          status: "success",
          durationMs: 0,
          payload: { from, textBody: textBody.slice(0, 200) },
          senderPhone: from,
          messagePreview: textBody.slice(0, 120)
        });

        // Cap conversation list length to retain context efficiency
        if (conversations[convoKey].messages.length > 20) {
          conversations[convoKey].messages = conversations[convoKey].messages.slice(-20);
        }

        // Gather loaded tenant values
        const botName = tenant.botName || "Assistant";
        const tone = tenant.tone || "friendly";
        const appointmentsList = tenant.appointments || [];
        const tenantName = tenant.name || "Our Business";
        const tenantIndustry = tenant.industry || "General Services";
        const tenantDescription = tenant.description || "";
        const systemInstruction = tenant.systemInstruction || "";

        // Prepare LLM template prompt context
        const ragResult = await getRAGContext(textBody, tenantId);
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

Your direct objectives in the continuous chat are:
1. Greet the customer and answer their questions beautifully and concisely (WhatsApp messages should remain under 3-4 neat sentences, using clean whitespace and occasional emojis if casual).
2. Lead Capture: If the customer shows genuine client/buyer interest and provides or agrees to provide their name, email, or telephone, trigger 'capture_lead' action.
3. Appointment Booking: If they express the explicit intent to book a meeting, look at the calendar busy slots above, suggest an unoccupied time slot (within normal business hours 9am - 5pm, from Monday to Friday), and if they agree to a specific date/time, trigger 'book_appointment' action.

Your response MUST be returned strictly in JSON format matching the schema requested below.
Do not wrap your output in markdown codeblocks like \`\`\`json. Return bare clean JSON.`
        });

        // Map conversation messages to Gemini format
        const contents = conversations[convoKey].messages.map((m: any) => {
          return {
            role: m.sender === 'bot' ? 'model' : 'user',
            parts: [{ text: m.text }]
          };
        });

        const autopilot = tenant.autopilotEnabled !== false;

        if (autopilot) {
          const currentAi = ai;
          let botReply = `Hello! Thanks for writing to us. I am ${botName}, your autonomous helper. How can I assist you today?`;
          let actionTriggered = null;

          if (currentAi) {
            try {
              logger.info({ from }, "[META WEBHOOK AI] Invoking Gemini-2.0-flash");
              const response = await currentAi.models.generateContent({
                model: "gemini-2.0-flash",
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
              } catch (pErr) {
                const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
                if (match?.[1]) {
                  parsedData = JSON.parse(match[1].trim());
                } else {
                  throw pErr;
                }
              }

              if (parsedData?.reply) {
                botReply = parsedData.reply;
                actionTriggered = parsedData.actionTriggered;
              }
            } catch (aiErr) {
              logger.error({ err: aiErr }, "[META WEBHOOK AI] Error during AI content generation");
            }
          } else {
            logger.warn("[META WEBHOOK AI] Bypassing Gemini inference because no AI API key is configured.");
          }

          if (actionTriggered) {
            logger.info({ action: actionTriggered }, "[META WEBHOOK AI] Action triggered autonomously");
            try {
              const actDetails = JSON.parse(actionTriggered.details || "{}");
              let tenantModified = false;

              if (actionTriggered.type === 'capture_lead') {
                const newLead = {
                  id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  name: actDetails.name || senderName || "WhatsApp Customer",
                  phone: actDetails.phone || from,
                  email: actDetails.email || "no-email@whatsapp.com",
                  status: 'New' as const,
                  dateCaptured: new Date().toISOString().split('T')[0],
                  note: "Captured autonomously via WhatsApp webhook thread."
                };
                if (!tenant.leads) tenant.leads = [];
                tenant.leads.push(newLead);
                tenantModified = true;
                logger.info({ lead: newLead }, "[META WEBHOOK CRM] Captured new Lead autonomously in CRM store");
              } else if (actionTriggered.type === 'book_appointment') {
                const newAppt = {
                  id: `appt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  customerName: actDetails.name || senderName || "WhatsApp Customer",
                  customerPhone: actDetails.phone || from,
                  email: actDetails.email || "no-email@whatsapp.com",
                  start: actDetails.startStr || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0] + "T10:00:00",
                  end: actDetails.endStr || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0] + "T10:30:00",
                  summary: actDetails.summary || `Autonomous Booking with ${botName}`,
                  notes: "Booked autonomously via WhatsApp webhook thread.",
                  syncedWithGoogle: false
                };
                if (!tenant.appointments) tenant.appointments = [];
                tenant.appointments.push(newAppt);
                tenantModified = true;
                logger.info({ appointment: newAppt }, "[META WEBHOOK CALENDAR] Booked new Appointment autonomously in CRM calendar");
              } else if (actionTriggered.type === 'purchase_item') {
                if (!tenant.leads) tenant.leads = [];
                const matchedLeadIndex = tenant.leads.findIndex((l: any) => 
                  (actDetails.email && l.email && l.email.toLowerCase() === actDetails.email.toLowerCase()) ||
                  (actDetails.phone && l.phone === actDetails.phone) ||
                  (l.name.toLowerCase() === (actDetails.name || senderName || "").toLowerCase())
                );
                const orderDetails = actDetails.item || actDetails.details || "Product checkout";
                if (matchedLeadIndex > -1) {
                  tenant.leads[matchedLeadIndex].status = 'Qualified';
                  tenant.leads[matchedLeadIndex].note = `${tenant.leads[matchedLeadIndex].note || ""}\n🛒 Ordered: ${orderDetails} (Total: ${actDetails.price || "N/A"})`.trim();
                } else {
                  const newLead = {
                    id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    name: actDetails.name || senderName || "Shopping Buyer",
                    phone: actDetails.phone || from,
                    email: actDetails.email || "shopping-buyer@gmail.com",
                    status: 'Qualified' as const,
                    dateCaptured: new Date().toISOString().split('T')[0],
                    note: `🛒 Autonomously placed purchase order: ${orderDetails} (Total: ${actDetails.price || "N/A"})`
                  };
                  tenant.leads.push(newLead);
                }
                tenantModified = true;
                logger.info({ orderDetails }, "[META WEBHOOK CRM] E-Commerce Purchase registered autonomously");
              }

              tenant.messageCount = (tenant.messageCount || 0) + 1;
              tenantModified = true;

              if (tenantModified) {
                const storeWrite = await readTenantsStore();
                storeWrite[tenantId] = tenant;
                await writeTenantsStore(storeWrite);
              }
            } catch (actErr) {
              logger.error({ err: actErr }, "[META WEBHOOK ACTION] Error executing AI action");
            }
          }

          conversations[convoKey].messages.push({
            sender: "bot",
            text: botReply,
            timestamp: new Date().toISOString(),
            citations: citations
          });
          await writeConversationsStore(conversations);

          const durationMs = Date.now() - inboundAt;
          // Record AI reply analytics
          recordEvent(tenantId, "message_sent", "whatsapp", { durationMs, usedRAG: citations.length > 0 });
          if (citations.length > 0) {
            recordEvent(tenantId, "rag_used", "whatsapp", { citations });
          }
          logWebhookEvent(tenantId, {
            channel: "whatsapp",
            direction: "outbound",
            status: "success",
            durationMs,
            payload: { to: from, botReply: botReply.slice(0, 200), citations },
            senderPhone: from,
            messagePreview: botReply.slice(0, 120)
          });

          const targetPhoneNumberId = tenant.whatsAppVerifiedSid || value?.metadata?.phone_number_id;
          const accessToken = tenant.whatsAppApiKey || process.env.WHATSAPP_TOKEN;

          if (targetPhoneNumberId && accessToken && !isPlaceholderToken(accessToken)) {
            try {
              logger.info({ from, targetPhoneNumberId }, "[META WEBHOOK OUTBOUND] Sending real Graph API envelope");
              await sendWhatsAppMessage(targetPhoneNumberId, accessToken, from, botReply);
            } catch (graphErr) {
              logger.error({ err: graphErr }, "[META WEBHOOK OUTBOUND] Failed to post message via Meta Graph API");
            }
          } else {
            logger.warn({ tenantId }, "[META WEBHOOK OUTBOUND] Bypassing Graph API delivery because Meta credentials are placeholders or defaults");
          }
        } else {
          logger.info({ tenantId }, "[META WHATSAPP TAKEOVER] Autopilot is disabled for tenant. Session is in manual takeover mode.");
        }
      }
    }
  } catch (err: any) {
    logger.error({ err }, "[META WEBHOOK] Error routing Facebook/WhatsApp payload");
    // Suppress errors and send 200 OK to keep Meta webhook server active
    if (!res.headersSent) {
      res.status(200).send("Processed with error");
    }
  }
}));

// Telegram Webhook Message Receiver Endpoint (POST)
router.post("/api/webhook/telegram/:tenantId", asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const store = await readTenantsStore();
  const tenant = store[tenantId];

  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  // Quota check
  const tier = tenant.subscriptionTier || "Free";
  const count = tenant.messageCount || 0;
  let isOverQuota = false;
  if (tier === "Free" && count >= 50) isOverQuota = true;
  else if (tier === "Starter" && count >= 500) isOverQuota = true;
  else if (tier === "Business" && count >= 5000) isOverQuota = true;

  if (isOverQuota) {
    logger.warn({ tenantId, count, tier }, "[TELEGRAM WEBHOOK] Tenant is over quota. Rejecting message");
    return res.status(403).json({ error: "Quota Exceeded. Please upgrade your subscription plan." });
  }

  const message = req.body.message;
  if (!message) {
    return res.status(200).send("No message object in payload");
  }

  const fromId = message.chat?.id || message.from?.id;
  const textBody = message.text || "";
  const senderName = message.from?.first_name || "Telegram User";

  if (!textBody) {
    return res.status(200).send("No text message to process");
  }

  logger.info({ senderName, fromId, textBody }, "[TELEGRAM WEBHOOK] Inbound message");

  // Load conversation history
  const conversations = await readConversationsStore();
  const convoKey = `${tenantId}_tg_${fromId}`;
  if (!conversations[convoKey]) {
    conversations[convoKey] = { messages: [] };
  }

  conversations[convoKey].messages.push({
    sender: "customer",
    text: textBody,
    timestamp: new Date().toISOString()
  });

  if (conversations[convoKey].messages.length > 20) {
    conversations[convoKey].messages = conversations[convoKey].messages.slice(-20);
  }

  const botName = tenant.botName || "Assistant";
  const tone = tenant.tone || "friendly";
  const appointmentsList = tenant.appointments || [];
  const tenantName = tenant.name || "Our Business";
  const tenantIndustry = tenant.industry || "General Services";
  const tenantDescription = tenant.description || "";
  const systemInstruction = tenant.systemInstruction || "";

  const ragResult = await getRAGContext(textBody, tenantId);
  const kbContext = ragResult.contextText;
  const citations = ragResult.citations;
  const scheduleContext = appointmentsList && appointmentsList.length > 0
    ? appointmentsList.map((app: any) => `- Booked Slot: From ${app.start} to ${app.end}`).join("\n")
    : "No conflicting scheduled bookings on the calendar.";

  const systemPrompt = buildSystemPrompt({
    channel: `Telegram AI Bot representing the tenant "${tenantName}" (${tenantIndustry})`,
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

  const contents = conversations[convoKey].messages.map((m: any) => {
    return {
      role: m.sender === 'bot' ? 'model' : 'user',
      parts: [{ text: m.text }]
    };
  });

  const autopilot = tenant.autopilotEnabled !== false;
  let botReply = `Hello! Thanks for writing to us. I am ${botName}, your helper. How can I assist you?`;
  let actionTriggered = null;

  if (autopilot) {
    const currentAi = ai;
    if (currentAi) {
      try {
        const response = await currentAi.models.generateContent({
          model: "gemini-2.0-flash",
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                actionTriggered: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    type: { type: Type.STRING },
                    details: { type: Type.STRING }
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
        } catch (pErr) {
          const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
          if (match?.[1]) {
            parsedData = JSON.parse(match[1].trim());
          } else {
            throw pErr;
          }
        }
        if (parsedData?.reply) {
          botReply = parsedData.reply;
          actionTriggered = parsedData.actionTriggered;
        }
      } catch (aiErr) {
        logger.error({ err: aiErr }, "[TELEGRAM AI ERROR]");
      }
    }
  }

  // Handle actions (lead capture, appointment booking)
  let tenantModified = false;
  if (actionTriggered) {
    try {
      const actDetails = JSON.parse(actionTriggered.details || "{}");
      if (actionTriggered.type === 'capture_lead') {
        const newLead = {
          id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: actDetails.name || senderName || "Telegram User",
          phone: actDetails.phone || "Telegram Chat",
          email: actDetails.email || "no-email@telegram.com",
          status: 'New' as const,
          dateCaptured: new Date().toISOString().split('T')[0],
          note: "Captured autonomously via Telegram bot."
        };
        if (!tenant.leads) tenant.leads = [];
        tenant.leads.push(newLead);
        tenantModified = true;
      } else if (actionTriggered.type === 'book_appointment') {
        const newAppt = {
          id: `appt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          customerName: actDetails.name || senderName || "Telegram User",
          customerPhone: actDetails.phone || "Telegram Chat",
          email: actDetails.email || "no-email@telegram.com",
          start: actDetails.startStr || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0] + "T10:00:00",
          end: actDetails.endStr || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0] + "T10:30:00",
          summary: actDetails.summary || `Autonomous Booking with ${botName}`,
          notes: "Booked autonomously via Telegram bot.",
          syncedWithGoogle: false
        };
        if (!tenant.appointments) tenant.appointments = [];
        tenant.appointments.push(newAppt);
        tenantModified = true;
      }
    } catch (actErr) {
      logger.error({ err: actErr }, "[TELEGRAM ACTION ERROR]");
    }
  }

  // Increment usage quota count
  tenant.messageCount = (tenant.messageCount || 0) + 1;
  tenantModified = true;

  if (tenantModified) {
    const storeWrite = await readTenantsStore();
    storeWrite[tenantId] = tenant;
    await writeTenantsStore(storeWrite);
  }

  // Save bot replies to conversations database
  conversations[convoKey].messages.push({
    sender: "bot",
    text: botReply,
    timestamp: new Date().toISOString(),
    citations: citations
  });
  await writeConversationsStore(conversations);

  // Send message back to Telegram
  const botToken = tenant.telegramBotToken;
  if (botToken && !isPlaceholderToken(botToken)) {
    try {
      logger.info({ fromId }, "[TELEGRAM OUTBOUND] Sending telegram message to chat");
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: fromId, text: botReply })
      });
    } catch (tgErr) {
      logger.error({ err: tgErr }, "[TELEGRAM OUTBOUND ERROR]");
    }
  } else {
    logger.warn("[TELEGRAM OUTBOUND] Bypassing Telegram API send because token is empty/placeholder.");
  }

  res.status(200).send("OK");
}));

// Twilio SMS Webhook Message Receiver Endpoint (POST)
router.post("/api/webhook/twilio/sms/:tenantId", asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const store = await readTenantsStore();
  const tenant = store[tenantId];

  if (!tenant) {
    res.type("text/xml");
    return res.status(404).send("<Response><Message>Tenant not found</Message></Response>");
  }

  // Quota check
  const tier = tenant.subscriptionTier || "Free";
  const count = tenant.messageCount || 0;
  let isOverQuota = false;
  if (tier === "Free" && count >= 50) isOverQuota = true;
  else if (tier === "Starter" && count >= 500) isOverQuota = true;
  else if (tier === "Business" && count >= 5000) isOverQuota = true;

  if (isOverQuota) {
    logger.warn({ tenantId, count, tier }, "[TWILIO SMS] Tenant is over quota. Rejecting message");
    res.type("text/xml");
    return res.status(403).send("<Response><Message>Quota Exceeded. Please upgrade your subscription plan.</Message></Response>");
  }

  const textBody = req.body.Body || "";
  const from = req.body.From || "";
  const senderName = "SMS User";

  if (!textBody) {
    res.type("text/xml");
    return res.status(200).send("<Response />");
  }

  logger.info({ from, textBody }, "[TWILIO SMS] Inbound message");

  // Load conversation history
  const conversations = await readConversationsStore();
  const convoKey = `${tenantId}_sms_${from}`;
  if (!conversations[convoKey]) {
    conversations[convoKey] = { messages: [] };
  }

  conversations[convoKey].messages.push({
    sender: "customer",
    text: textBody,
    timestamp: new Date().toISOString()
  });

  if (conversations[convoKey].messages.length > 20) {
    conversations[convoKey].messages = conversations[convoKey].messages.slice(-20);
  }

  const botName = tenant.botName || "Assistant";
  const tone = tenant.tone || "friendly";
  const appointmentsList = tenant.appointments || [];
  const tenantName = tenant.name || "Our Business";
  const tenantIndustry = tenant.industry || "General Services";
  const tenantDescription = tenant.description || "";
  const systemInstruction = tenant.systemInstruction || "";

  const ragResult = await getRAGContext(textBody, tenantId);
  const kbContext = ragResult.contextText;
  const citations = ragResult.citations;
  const scheduleContext = appointmentsList && appointmentsList.length > 0
    ? appointmentsList.map((app: any) => `- Booked Slot: From ${app.start} to ${app.end}`).join("\n")
    : "No conflicting scheduled bookings on the calendar.";

  const systemPrompt = buildSystemPrompt({
    channel: `SMS Text AI Bot representing the tenant "${tenantName}" (${tenantIndustry})`,
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

  const contents = conversations[convoKey].messages.map((m: any) => {
    return {
      role: m.sender === 'bot' ? 'model' : 'user',
      parts: [{ text: m.text }]
    };
  });

  const autopilot = tenant.autopilotEnabled !== false;
  let botReply = `Hello! Thanks for writing to us. I am ${botName}, your helper. How can I assist you?`;
  let actionTriggered = null;

  if (autopilot) {
    const currentAi = ai;
    if (currentAi) {
      try {
        const response = await currentAi.models.generateContent({
          model: "gemini-2.0-flash",
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                actionTriggered: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    type: { type: Type.STRING },
                    details: { type: Type.STRING }
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
        } catch (pErr) {
          const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
          if (match?.[1]) {
            parsedData = JSON.parse(match[1].trim());
          } else {
            throw pErr;
          }
        }
        if (parsedData?.reply) {
          botReply = parsedData.reply;
          actionTriggered = parsedData.actionTriggered;
        }
      } catch (aiErr) {
        logger.error({ err: aiErr }, "[TWILIO SMS AI ERROR]");
      }
    }
  }

  // Handle actions (lead capture, appointment booking)
  let tenantModified = false;
  if (actionTriggered) {
    try {
      const actDetails = JSON.parse(actionTriggered.details || "{}");
      if (actionTriggered.type === 'capture_lead') {
        const newLead = {
          id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: actDetails.name || senderName || "SMS User",
          phone: actDetails.phone || from,
          email: actDetails.email || "no-email@twilio-sms.com",
          status: 'New' as const,
          dateCaptured: new Date().toISOString().split('T')[0],
          note: "Captured autonomously via Twilio SMS."
        };
        if (!tenant.leads) tenant.leads = [];
        tenant.leads.push(newLead);
        tenantModified = true;
      } else if (actionTriggered.type === 'book_appointment') {
        const newAppt = {
          id: `appt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          customerName: actDetails.name || senderName || "SMS User",
          customerPhone: actDetails.phone || from,
          email: actDetails.email || "no-email@twilio-sms.com",
          start: actDetails.startStr || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0] + "T10:00:00",
          end: actDetails.endStr || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0] + "T10:30:00",
          summary: actDetails.summary || `Autonomous Booking with ${botName}`,
          notes: "Booked autonomously via Twilio SMS.",
          syncedWithGoogle: false
        };
        if (!tenant.appointments) tenant.appointments = [];
        tenant.appointments.push(newAppt);
        tenantModified = true;
      }
    } catch (actErr) {
      logger.error({ err: actErr }, "[TWILIO SMS ACTION ERROR]");
    }
  }

  // Increment usage quota count
  tenant.messageCount = (tenant.messageCount || 0) + 1;
  tenantModified = true;

  if (tenantModified) {
    const storeWrite = await readTenantsStore();
    storeWrite[tenantId] = tenant;
    await writeTenantsStore(storeWrite);
  }

  // Save bot replies to conversations database
  conversations[convoKey].messages.push({
    sender: "bot",
    text: botReply,
    timestamp: new Date().toISOString(),
    citations: citations
  });
  await writeConversationsStore(conversations);

  // Return TwiML XML
  res.type("text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${botReply}</Message>
</Response>`);
}));

export default router;
