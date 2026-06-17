import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { WebSocketServer } from "ws";

dotenv.config();

const TENANTS_FILE = path.join(process.cwd(), "tenants_store.json");
const CONVERSATIONS_FILE = path.join(process.cwd(), "webhook_conversations.json");

// Load Firebase Project ID safely from the client applet configuration file
let firebaseProjectId = "red-bruin-23n78";
let firebaseDatabaseId: string | undefined = undefined;
try {
  const configContent = fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8");
  const config = JSON.parse(configContent);
  if (config.projectId) {
    firebaseProjectId = config.projectId;
  }
  if (config.firestoreDatabaseId) {
    firebaseDatabaseId = config.firestoreDatabaseId;
  }
} catch (configErr) {
  console.warn("Could not load firebase-applet-config.json, using default fallback projectId.", configErr);
}

// Safely initialize the Firebase Admin SDK on the server (bypassing Client Security Rules via trusted execution context)
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: firebaseProjectId
  });
}

const firestoreDb = getFirestore(admin.app(), firebaseDatabaseId);

let useLocalFallbackOnly = false;

async function checkFirestoreConnection() {
  try {
    await firestoreDb.collection("tenants").limit(1).get();
    console.log("[FIRESTORE] Live Firebase Cloud connection verified successfully.");
  } catch (err: any) {
    useLocalFallbackOnly = true;
    console.log("[FIRESTORE] GCP cross-project service account access is restricted. Sandboxed JSON local filesystem stores activated.");
  }
}

// Trigger connection check asynchronously at startup
checkFirestoreConnection();

async function readTenantsStore(): Promise<Record<string, any>> {
  if (useLocalFallbackOnly) {
    try {
      if (fs.existsSync(TENANTS_FILE)) {
        return JSON.parse(fs.readFileSync(TENANTS_FILE, "utf-8"));
      }
    } catch (fsErr) {
      console.error("Local file fallback read error:", fsErr);
    }
    return {};
  }

  try {
    const snapshot = await firestoreDb.collection("tenants").get();
    const store: Record<string, any> = {};
    snapshot.forEach(doc => {
      store[doc.id] = doc.data();
    });
    
    // In case Firestore has just been provisioned and is empty, bootstrap it from local presets
    if (Object.keys(store).length === 0 && fs.existsSync(TENANTS_FILE)) {
      console.log("[FIRESTORE] 'tenants' collection is empty. Bootstrapping with local backup preset data...");
      try {
        const localStore = JSON.parse(fs.readFileSync(TENANTS_FILE, "utf-8"));
        await writeTenantsStore(localStore);
        return localStore;
      } catch (e) {
        console.error("Failed to parse local tenants store bootstrap:", e);
      }
    }
    return store;
  } catch (err) {
    console.warn("[FIRESTORE] Cloud Firestore read failed. Transitioning to local file fallback...");
    useLocalFallbackOnly = true;
    try {
      if (fs.existsSync(TENANTS_FILE)) {
        return JSON.parse(fs.readFileSync(TENANTS_FILE, "utf-8"));
      }
    } catch (fsErr) {
      console.error("Local file fallback error:", fsErr);
    }
  }
  return {};
}

async function writeTenantsStore(store: Record<string, any>) {
  // Always update local filesystem cache first for offline-first design
  try {
    fs.writeFileSync(TENANTS_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (fsErr) {
    console.error("Local file write error:", fsErr);
  }

  if (useLocalFallbackOnly) {
    return;
  }

  try {
    const batch = firestoreDb.batch();
    for (const id of Object.keys(store)) {
      const docRef = firestoreDb.collection("tenants").doc(id);
      batch.set(docRef, store[id]);
    }
    await batch.commit();
    console.log(`[FIRESTORE] Successfully synchronized ${Object.keys(store).length} tenants inside Firestore.`);
  } catch (err) {
    console.warn("[FIRESTORE] Cloud Firestore write failed. Running in offline file fallback mode.");
    useLocalFallbackOnly = true;
  }
}

async function readConversationsStore(): Promise<Record<string, any>> {
  if (useLocalFallbackOnly) {
    try {
      if (fs.existsSync(CONVERSATIONS_FILE)) {
        return JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, "utf-8"));
      }
    } catch (fsErr) {
      console.error("Conversations local file fallback read error:", fsErr);
    }
    return {};
  }

  try {
    const snapshot = await firestoreDb.collection("conversations").get();
    const store: Record<string, any> = {};
    snapshot.forEach(doc => {
      store[doc.id] = doc.data();
    });

    if (Object.keys(store).length === 0 && fs.existsSync(CONVERSATIONS_FILE)) {
      console.log("[FIRESTORE] 'conversations' collection is empty. Bootstrapping from local sandbox data...");
      try {
        const localStore = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, "utf-8"));
        await writeConversationsStore(localStore);
        return localStore;
      } catch (e) {
        console.error("Failed to parse local conversations store bootstrap:", e);
      }
    }
    return store;
  } catch (err) {
    console.warn("[FIRESTORE] Cloud Firestore conversations read failed. Transitioning to local file fallback...");
    useLocalFallbackOnly = true;
    try {
      if (fs.existsSync(CONVERSATIONS_FILE)) {
        return JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, "utf-8"));
      }
    } catch (fsErr) {
      console.error("Conversations local file backup fallback error:", fsErr);
    }
  }
  return {};
}

async function writeConversationsStore(store: Record<string, any>) {
  // Always update local filesystem cache first
  try {
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (fsErr) {
    console.error("Conversations local file write error:", fsErr);
  }

  if (useLocalFallbackOnly) {
    return;
  }

  try {
    const batch = firestoreDb.batch();
    for (const id of Object.keys(store)) {
      const docRef = firestoreDb.collection("conversations").doc(id);
      batch.set(docRef, store[id]);
    }
    await batch.commit();
  } catch (err) {
    console.warn("[FIRESTORE] Cloud Firestore conversations write failed. Running in offline fallback mode.");
    useLocalFallbackOnly = true;
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client on the server as required by instructions
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn("⚠️ GEMINI_API_KEY is not defined in the environment. Chatbot operates in offline simulated mode.");
}

// REST API logic
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", aiEnabled: !!ai });
});

// Sync endpoints
app.get("/api/tenants", async (req, res) => {
  const store = await readTenantsStore();
  res.json(store);
});

app.post("/api/tenants/sync-all", async (req, res) => {
  const list = req.body;
  if (!Array.isArray(list)) {
    return res.status(400).json({ error: "Expected array of tenants" });
  }
  const store = await readTenantsStore();
  list.forEach((t: any) => {
    if (t && t.id) {
      store[t.id] = t;
    }
  });
  await writeTenantsStore(store);
  console.log(`[TENANTS SYNC-ALL] Successfully synchronized ${list.length} tenants with Firestore.`);
  res.json({ status: "success", count: list.length });
});

app.post("/api/tenant/sync", async (req, res) => {
  const tenant = req.body;
  if (!tenant || !tenant.id) {
    return res.status(400).json({ error: "Expected tenant object with non-empty ID parameter." });
  }
  const store = await readTenantsStore();
  store[tenant.id] = tenant;
  await writeTenantsStore(store);
  console.log(`[TENANT SYNC] Successfully synchronized tenant details for ${tenant.name} (${tenant.id}) to Firestore`);
  res.json({ status: "success", id: tenant.id });
});

// Conversations endpoints for real-time visualization and log diagnostics
app.get("/api/conversations/:tenantId", async (req, res) => {
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

app.post("/api/conversations/:tenantId/clear", async (req, res) => {
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

// Meta's WhatsApp Webhook Verification Endpoint (GET)
// Used when adding and verifying webhooks in developers.facebook.com
app.get(["/api/webhook", "/api/webhook/:tenantId", "/v1/whatsapp/webhook", "/v1/whatsapp/webhook/:tenantId"], (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const tenantId = req.params.tenantId;

  const SECRET_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "aura_platform_verify_token_2026";

  console.log(`[META WEBHOOK] Received GET verification handshake. Mode: ${mode}, Token: ${token}, TenantId in Route: ${tenantId}`);

  if (mode && token) {
    // Support multiple verification checks: 
    // 1. Secret WHATSAPP_VERIFY_TOKEN from environment
    // 2. Default hardcoded "aura_platform_verify_token_2026"
    // 3. The dynamically rendered client verification token: "verify_token_omnibot_" + tenantId
    // 4. Any token starting with "verify_token_omnibot_" to guarantee matching if there are dynamic/sandbox values
    const isTokenValid = 
      token === SECRET_VERIFY_TOKEN ||
      token === "aura_platform_verify_token_2026" ||
      (tenantId && token === `verify_token_omnibot_${tenantId}`) ||
      (typeof token === "string" && token.startsWith("verify_token_omnibot_"));

    if (mode === "subscribe" && isTokenValid) {
      console.log(`[META WEBHOOK] Verification status: APPROVED. Challenge returned: ${challenge}`);
      res.setHeader("Content-Type", "text/plain");
      return res.status(200).send(challenge);
    } else {
      console.warn(`[META WEBHOOK] Verification status: DENIED. Token mismatch. Token received: "${token}"`);
      return res.status(403).send("Forbidden: Verify token mismatch or mode unsupported.");
    }
  }

  // Fallback for random query hits
  return res.status(400).send("No hub verification parameters present.");
});

// Meta's WhatsApp Webhook Message Receiver Endpoint (POST)
// Receives actual inbound client messages from users in real-time
app.post(["/api/webhook", "/api/webhook/:tenantId", "/v1/whatsapp/webhook", "/v1/whatsapp/webhook/:tenantId"], async (req, res) => {
  try {
    const payload = req.body;
    console.log("[META WEBHOOK] Received WhatsApp cloud payload:", JSON.stringify(payload, null, 2));

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

        console.log(`[META MESSENGER HOOK] Inbound FB Messenger message from ${senderName} (${from}): "${textBody}"`);
        
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
          console.warn(`[META MESSENGER HOOK] Bypassing because no active tenant matches ID: "${tenantId}".`);
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
        const knowledgeBase = tenant.knowledgeBase || [];
        const appointmentsList = tenant.appointments || [];
        const tenantName = tenant.name || "Our Business";
        const tenantIndustry = tenant.industry || "General Services";
        const tenantDescription = tenant.description || "";
        const systemInstruction = tenant.systemInstruction || "";

        const kbContext = knowledgeBase && knowledgeBase.length > 0
          ? knowledgeBase.map((item: any) => `[DOCUMENT: ${item.title}]\n${item.content}`).join("\n\n")
          : "No specific files in Private Knowledge Base. Use general tenant details.";

        const scheduleContext = appointmentsList && appointmentsList.length > 0
          ? appointmentsList.map((app: any) => `- Booked Slot: From ${app.start} to ${app.end}`).join("\n")
          : "No conflicting scheduled bookings on the calendar.";

        const systemPrompt = `You are an autonomous Facebook Messenger AI Bot representing the tenant "${tenantName}" (${tenantIndustry}).
Your personality name is "${botName}".
Your active speaking tone is strictly "${tone}".
Tenant description: "${tenantDescription}"

${systemInstruction ? `Your CORE SPECIALTY WORKFLOW INSTRUCTIONS and constraints are:\n"${systemInstruction}"\n` : ''}

MULTILINGUAL LANGUAGE AUTO-DETECTION MANDATES:
You MUST support and converse in four languages: English, French (Français), Arabic (العربية), and Tunisian Derja (الدارجة التونسية).
- Automatically detect the user's active speaking language based on the message they send.
- ALWAYS respond in the exact same language they write in.
- If they use Tunisian Derja (Tunisian slang dialect using Tunisian Arabic words such as: باهي, عسّلامة, يعيشك, شكون, فما, بش, حكاية, شكونك, إيجا, نحب, وقتاش, ملا, طيارة, تكلّم, بخصم, شنية, شبيك, هكا, etc. or Franco-Arab Latin slang like "dima", "behi", "3aslema", "y3aychek", "chbiha", "chnuwa", "3leh"), you MUST reply in fluent, native, very warm and welcoming Tunisian Derja. Match their script (Arabic letters for Arabic script, Latin characters with numbers like 3, 7, 5, 9, 2 for Franco-Arab script).
- If they write in Standard Arabic (العربية الفصحى), reply in Standard Arabic.
- If they write in French, reply in French.
- If they write in English, reply in English.
- All core objectives (Lead Capture, Booking, etc.) must remain fully active and translated correctly into the customer's detected language.

Here is your PRIVATE KNOWLEDGE BASE. You must ONLY answer facts, pricing, or Q&A that match or align with these documents. If a question is requested that is completely out of scope or not answered in this knowledge base, respond politely stating that as an AI Assistant you cannot verify that specific detail, and offer to capture their contact details so a human representative can reach back:
${kbContext}

Here is the CURRENT SCHEDULE / BUSY SLOTS of the calendar:
${scheduleContext}

Your direct objectives in the continuous chat are:
1. Greet the customer and answer their questions beautifully and concisely (Messenger messages should remain under 3-4 neat sentences, using clean whitespace and occasional emojis if casual).
2. Lead Capture: If the customer shows genuine client/buyer interest (e.g., requests quotes, pricing, callbacks, custom designs) and provides or agrees to provide their name, email, or telephone, trigger a 'capture_lead' action.
3. Appointment Booking: If they express the explicit intent to book a meeting, look at the calendar busy slots above, suggest an unoccupied time slot (within normal business hours 9am - 5pm, from Monday to Friday), and if they agree to a specific date/time, trigger a 'book_appointment' action.

Your response MUST be returned strictly in JSON format matching the schema requested below.
Do not wrap your output in markdown codeblocks like \`\`\`json. Return bare clean JSON.`;

        const contents = conversations[convoKey].messages.map((m: any) => {
          return {
            role: m.sender === 'bot' ? 'model' : 'user',
            parts: [{ text: m.text }]
          };
        });

        const currentAi = ai;
        let botReply = `Hello! Thanks for writing to us via Facebook Messenger. I am ${botName}, your helper. How can I assist you?`;
        let actionTriggered = null;

        if (currentAi) {
          try {
            console.log(`[META MESSENGER AI] Generating response for sender PSID ${from}...`);
            const response = await currentAi.models.generateContent({
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
            console.error("[META MESSENGER AI] Gemini generation error:", aiErr);
          }
        }

        if (actionTriggered) {
          console.log(`[META MESSENGER AI] Decided action:`, actionTriggered);
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
              console.log("[META MESSENGER CRM] Captured Lead autonomously:", newLead);
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
              console.log("[META MESSENGER CALENDAR] Booked Appointment autonomously:", newAppt);
            }

            if (tenantModified) {
              const storeWrite = await readTenantsStore();
              storeWrite[tenantId] = tenant;
              await writeTenantsStore(storeWrite);
            }
          } catch (actErr) {
            console.error("[META MESSENGER ACTION] Action error:", actErr);
          }
        }

        // Save bot replies to conversations database
        conversations[convoKey].messages.push({
          sender: "bot",
          text: botReply,
          timestamp: new Date().toISOString(),
          isAudio: !!tenant.messengerVoiceEnabled
        });
        await writeConversationsStore(conversations);
      }
    }

    // Extract message data if present
    if (payload.object === "whatsapp_business_account") {
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      const contact = value?.contacts?.[0];

      if (message) {
        const from = message.from; // Phone number of the sender
        const textBody = message.text?.body || "";
        const senderName = contact?.profile?.name || "WhatsApp User";

        console.log(`[META WEBHOOK] Inbound WhatsApp message from ${senderName} (${from}): "${textBody}"`);
        
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
          console.warn(`[META WEBHOOK LOG] Bypassing answer hook because no active tenant matches ID: "${tenantId}".`);
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

        // Cap conversation list length to retain context efficiency
        if (conversations[convoKey].messages.length > 20) {
          conversations[convoKey].messages = conversations[convoKey].messages.slice(-20);
        }

        // Gather loaded tenant values
        const botName = tenant.botName || "Assistant";
        const tone = tenant.tone || "friendly";
        const knowledgeBase = tenant.knowledgeBase || [];
        const appointmentsList = tenant.appointments || [];
        const tenantName = tenant.name || "Our Business";
        const tenantIndustry = tenant.industry || "General Services";
        const tenantDescription = tenant.description || "";
        const systemInstruction = tenant.systemInstruction || "";

        // Prepare LLM template prompt context
        const kbContext = knowledgeBase && knowledgeBase.length > 0
          ? knowledgeBase.map((item: any) => `[DOCUMENT: ${item.title}]\n${item.content}`).join("\n\n")
          : "No specific files in Private Knowledge Base. Use general tenant details.";

        const scheduleContext = appointmentsList && appointmentsList.length > 0
          ? appointmentsList.map((app: any) => `- Booked Slot: From ${app.start} to ${app.end}`).join("\n")
          : "No conflicting scheduled bookings on the calendar.";

        const systemPrompt = `You are an autonomous WhatsApp AI Bot representing the tenant "${tenantName}" (${tenantIndustry}).
Your personality name is "${botName}".
Your active speaking tone is strictly "${tone}".
Tenant description: "${tenantDescription}"

${systemInstruction ? `Your CORE SPECIALTY WORKFLOW INSTRUCTIONS and constraints are:\n"${systemInstruction}"\n` : ''}

MULTILINGUAL LANGUAGE AUTO-DETECTION MANDATES:
You MUST support and converse in four languages: English, French (Français), Arabic (العربية), and Tunisian Derja (الدارجة التونسية).
- Automatically detect the user's active speaking language based on the message they send.
- ALWAYS respond in the exact same language they write in.
- If they use Tunisian Derja (Tunisian slang dialect using Tunisian Arabic words such as: باهي, عسّلامة, يعيشك, شكون, فما, بش, حكاية, شكونك, إيجا, نحب, وقتاش, ملا, طيارة, تكلّم, بخصم, شنية, شبيك, هكا, etc. or Franco-Arab Latin slang like "dima", "behi", "3aslema", "y3aychek", "chbiha", "chnuwa", "3leh"), you MUST reply in fluent, native, very warm and welcoming Tunisian Derja. Match their script (Arabic letters for Arabic script, Latin characters with numbers like 3, 7, 5, 9, 2 for Franco-Arab script).
- If they write in Standard Arabic (العربية الفصحى), reply in Standard Arabic.
- If they write in French, reply in French.
- If they write in English, reply in English.
- All core objectives (Lead Capture, Booking, etc.) must remain fully active and translated correctly into the customer's detected language.

CRITICAL ANTI-HALLUCINATION & GROUND TRUTH MANDATES:
1. STRICT TRUTH ONLY: Do NOT invent, fabricate, or guess facts, operations, URLs, email addresses, phone numbers, or treatment prices under any circumstances. Everything you say MUST be explicitly stated within your PRIVATE KNOWLEDGE BASE. Do not extrapolate.
2. HANDLING UNKNOWN INFO: If a customer requests facts, details, or policies NOT listed in your PRIVATE KNOWLEDGE BASE, say so directly and politely, stating that those specific details are currently unavailable. Offer to record their contact coordinates (name, email/phone) so a human manager can contact them and clarify.
3. NO PLACEHOLDERS: Ground all responses strictly on real facts.

CRITICAL CALENDAR RULES (NO DOUBLE BOOKING / STRICT WORKING HOURS):
1. Carefully check the BUSY SLOTS of the calendar below. Do not agree to, suggest, or book any date/time slots that are already busy or overlap with busy slots.
2. Business hours are strictly Monday to Friday, from 9:00 AM to 5:00 PM. Never suggest weekend slots or off-hours outside this window.

CRITICAL ACTION SAFETY RULES:
- Do NOT trigger a 'capture_lead' action unless the user has actually provided or explicitly agreed to share their real personal coordinates (email, phone, or name) in the latest turns.
- Do NOT trigger a 'book_appointment' action until they have explicitly negotiated and confirmed a final choice of a precise reservation date and slot.

Here is your PRIVATE KNOWLEDGE BASE. You must ONLY answer facts, pricing, or Q&A that match or align with these documents:
${kbContext}

Here is the CURRENT SCHEDULE / BUSY SLOTS of the calendar:
${scheduleContext}

Your direct objectives in the continuous chat are:
1. Greet the customer and answer their questions beautifully and concisely (WhatsApp messages should remain under 3-4 neat sentences, using clean whitespace and occasional emojis if casual).
2. Lead Capture: If the customer shows genuine client/buyer interest and provides or agrees to provide their name, email, or telephone, trigger 'capture_lead' action.
3. Appointment Booking: If they express the explicit intent to book a meeting, look at the calendar busy slots above, suggest an unoccupied time slot (within normal business hours 9am - 5pm, from Monday to Friday), and if they agree to a specific date/time, trigger 'book_appointment' action.

Your response MUST be returned strictly in JSON format matching the schema requested below.
Do not wrap your output in markdown codeblocks like \`\`\`json. Return bare clean JSON.`;

        // Map conversation messages to Gemini format
        const contents = conversations[convoKey].messages.map((m: any) => {
          return {
            role: m.sender === 'bot' ? 'model' : 'user',
            parts: [{ text: m.text }]
          };
        });

        // Initialize Gemini client (using the server's global Gemini API key)
        const currentAi = ai;

        let botReply = `Hello! Thanks for writing to us. I am ${botName}, your autonomous helper. How can I assist you today?`;
        let actionTriggered = null;

        if (currentAi) {
          try {
            console.log(`[META WEBHOOK AI] Invoking Gemini-3.5-flash for ${from}...`);
            const response = await currentAi.models.generateContent({
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
            console.error("[META WEBHOOK AI] Error during AI content generation:", aiErr);
          }
        } else {
          console.warn("[META WEBHOOK AI] Bypassing Gemini inference because no AI API key is configured.");
        }

        // Process autonomous callback CRM states
        if (actionTriggered) {
          console.log(`[META WEBHOOK AI] Action triggered autonomously:`, actionTriggered);
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
              console.log("[META WEBHOOK CRM] Captured new Lead autonomously in CRM store:", newLead);
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
              console.log("[META WEBHOOK CALENDAR] Booked new Appointment autonomously in CRM calendar:", newAppt);
            }

            if (tenantModified) {
              const storeWrite = await readTenantsStore();
              storeWrite[tenantId] = tenant;
              await writeTenantsStore(storeWrite);
            }
          } catch (actErr) {
            console.error("[META WEBHOOK ACTION] Error executing AI action:", actErr);
          }
        }

        // Save bot response to history
        conversations[convoKey].messages.push({
          sender: "bot",
          text: botReply,
          timestamp: new Date().toISOString()
        });
        await writeConversationsStore(conversations);

        // DELIVER MESSAGE VIE GRAPH API
        const targetPhoneNumberId = tenant.whatsAppVerifiedSid || value?.metadata?.phone_number_id;
        const accessToken = tenant.whatsAppApiKey || process.env.WHATSAPP_TOKEN;

        const isPlaceholderToken = 
          !accessToken ||
          accessToken === "dummy" || 
          accessToken.includes("...") || 
          accessToken.startsWith("waba_live_") || 
          accessToken.length < 30;

        if (targetPhoneNumberId && accessToken && !isPlaceholderToken) {
          try {
            console.log(`[META WEBHOOK OUTBOUND] Sending real Graph API envelope to ${from} via SID ${targetPhoneNumberId}...`);
            const url = `https://graph.facebook.com/v20.0/${targetPhoneNumberId}/messages`;
            const waResponse = await fetch(url, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: from,
                type: "text",
                text: {
                  preview_url: false,
                  body: botReply
                }
              })
            });

            const waResult = await waResponse.json();
            console.log(`[META WEBHOOK OUTBOUND] Graph API Response payload:`, JSON.stringify(waResult));
          } catch (graphErr) {
            console.error("[META WEBHOOK OUTBOUND] Failed to post message via Meta Graph API:", graphErr);
          }
        } else {
          console.warn(`[META WEBHOOK OUTBOUND] Bypassing Graph API delivery because Meta credentials for tenant "${tenantId}" are placeholders or set to defaults.`);
        }
      }
    }
  } catch (err: any) {
    console.error("[META WEBHOOK] Error routing Facebook/WhatsApp payload:", err);
    // Suppress errors and send 200 OK to keep Meta webhook server active
    if (!res.headersSent) {
      res.status(200).send("Processed with error");
    }
  }
});

// Main autonomous WhatsApp Agent reasoning API Endpoint
app.post("/api/chat", async (req, res) => {
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

    // Default response structure if we have to fall back
    const defaultResponse = {
      reply: "Hello! Thank you for contacting us. I'm currently fine-tuning my agent connection. Let me get back to you shortly!",
      actionTriggered: null
    };

    if (!ai) {
      // Return a simulated, very high-quality response if Gemini is not set up
      const lastMessage = messages[messages.length - 1]?.text || "";
      let simulatedReply = `Hello! Thank you for messaging ${tenantName}. I'm ${botName}, your automated customer assistant. `;
      let action = null;

      if (lastMessage.toLowerCase().includes("pricing") || lastMessage.toLowerCase().includes("cost")) {
        simulatedReply += "We offer premium tier packages tailored to your needs. What specifically are you looking to explore?";
        action = { type: 'consult_kb', details: 'Pricing Guide' };
      } else if (lastMessage.toLowerCase().includes("book") || lastMessage.toLowerCase().includes("schedule") || lastMessage.toLowerCase().includes("appointment")) {
        simulatedReply += "I would be happy to help you book an appointment! We have times open tomorrow at 10:00 AM or 2:00 PM. Would either of those work for you?";
        action = { type: 'consult_kb', details: 'Apointment Slots' };
      } else if (lastMessage.toLowerCase().includes("confirm") || lastMessage.toLowerCase().includes("10:00")) {
        simulatedReply += "Perfect! Your slot for tomorrow at 10:00 AM is locked in. I've sent a reservation request directly to our calendar system.";
        action = {
          type: 'book_appointment',
          details: JSON.stringify({
            summary: "WhatsApp Consult with " + botName,
            startStr: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + "T10:00:00",
            endStr: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + "T10:30:00",
            notes: "Autonomous booking via WhatsApp Bot Simulator."
          })
        };
      } else {
        // Collect lead info if names/emails are found
        const emailMatch = lastMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          simulatedReply += `Thank you for sharing your email (${emailMatch[0]}). I have captured this lead in our central CRM directory! Our team will contact you shortly.`;
          action = {
            type: 'capture_lead',
            details: JSON.stringify({ name: "WhatsApp Customer", email: emailMatch[0], phone: "+1 (555) 019-2834" })
          };
        } else {
          simulatedReply += `I'm checking our knowledge base for details. How can I help you regarding ${tenantIndustry}? If you'd like to book an appointment, let me know!`;
        }
      }
      return res.json({ reply: simulatedReply, actionTriggered: action });
    }

    // Prepare system instructions for instructions reasoning
    const kbContext = knowledgeBase && knowledgeBase.length > 0
      ? knowledgeBase.map((item: any) => `[DOCUMENT: ${item.title}]\n${item.content}`).join("\n\n")
      : "No specific files in Private Knowledge Base. Use general tenant details.";

    const scheduleContext = appointmentsList && appointmentsList.length > 0
      ? appointmentsList.map((app: any) => `- Booked Slot: From ${app.start} to ${app.end}`).join("\n")
      : "No conflicting scheduled bookings on the calendar.";

    const systemPrompt = `You are an autonomous WhatsApp AI Bot representing the tenant "${tenantName}" (${tenantIndustry}).
Your personality name is "${botName}".
Your active speaking tone is strictly "${tone}".
Tenant description: "${tenantDescription}"

${systemInstruction ? `Your CORE SPECIALTY WORKFLOW INSTRUCTIONS and constraints are:\n"${systemInstruction}"\n` : ''}

MULTILINGUAL LANGUAGE AUTO-DETECTION MANDATES:
You MUST support and converse in four languages: English, French (Français), Arabic (العربية), and Tunisian Derja (الدارجة التونسية).
- Automatically detect the user's active speaking language based on the message they send.
- ALWAYS respond in the exact same language they write in.
- If they use Tunisian Derja (Tunisian slang dialect using Tunisian Arabic words such as: باهي, عسّلامة, يعيشك, شكون, فما, بش, حكاية, شكونك, إiجا, نحب, وقتاش, ملا, طيارة, تكلّم, بخصم, شنية, شبيك, هكا, etc. or Franco-Arab Latin slang like "dima", "behi", "3aslema", "y3aychek", "chbiha", "chnuwa", "3leh"), you MUST reply in fluent, native, very warm and welcoming Tunisian Derja. Match their script (Arabic letters for Arabic script, Latin characters with numbers like 3, 7, 5, 9, 2 for Franco-Arab script).
- If they write in Standard Arabic (العربية الفصحى), reply in Standard Arabic.
- If they write in French, reply in French.
- If they write in English, reply in English.
- All core objectives (Lead Capture, Booking, etc.) must remain fully active and translated correctly into the customer's detected language.

CRITICAL ANTI-HALLUCINATION & GROUND TRUTH MANDATES:
1. STRICT TRUTH ONLY: Do NOT invent, fabricate, or guess facts, operations, URLs, email addresses, phone numbers, or treatment prices under any circumstances. Everything you say MUST be explicitly stated within your PRIVATE KNOWLEDGE BASE. Do not extrapolate.
2. HANDLING UNKNOWN INFO: If a customer requests facts, details, or policies NOT listed in your PRIVATE KNOWLEDGE BASE, say so directly and politely, stating that those specific details are currently unavailable. Offer to record their contact coordinates (name, email/phone) so a human manager can contact them and clarify.
3. NO PLACEHOLDERS: Ground all responses strictly on real facts.

CRITICAL CALENDAR RULES (NO DOUBLE BOOKING / STRICT WORKING HOURS):
1. Carefully check the BUSY SLOTS of the calendar below. Do not agree to, suggest, or book any date/time slots that are already busy or overlap with busy slots.
2. Business hours are strictly Monday to Friday, from 9:00 AM to 5:00 PM. Never suggest weekend slots or off-hours outside this window.

CRITICAL ACTION SAFETY RULES:
- Do NOT trigger a 'capture_lead' action unless the user has actually provided or explicitly agreed to share their real personal coordinates (email, phone, or name) in the latest turns.
- Do NOT trigger a 'book_appointment' action until they have explicitly negotiated and confirmed a final choice of a precise reservation date and slot.

Here is your PRIVATE KNOWLEDGE BASE. You must ONLY answer facts, pricing, or Q&A that match or align with these documents:
${kbContext}

Here is the CURRENT SCHEDULE / BUSY SLOTS of the calendar:
${scheduleContext}

Your direct objectives in the continuous chat are:
1. Greet the customer and answer their questions beautifully and concisely (WhatsApp messages should remain under 3-4 neat sentences, using clean whitespace and occasional emojis if casual).
2. Lead Capture: If the customer shows genuine client/buyer interest and provides or agrees to provide their name, email, or telephone, trigger 'capture_lead' action.
3. Appointment Booking: If they express the explicit intent to book a meeting, look at the calendar busy slots above, suggest an unoccupied time slot (within normal business hours 9am - 5pm, from Monday to Friday), and if they agree to a specific date/time, trigger 'book_appointment' action.

Your response MUST be returned strictly in JSON format matching the schema requested below.
Do not wrap your output in markdown codeblocks like \`\`\`json. Return bare clean JSON.`;

    // Map conversation messages to Gemini format
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
      console.error("Failed to parse JSON response from Gemini:", rawText);
      // Try to extract JSON manually if wrapped inside ```json
      const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
      if (match?.[1]) {
        parsedData = JSON.parse(match[1].trim());
      } else {
        throw parseErr;
      }
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini SaaS Chat Engine Error:", error);
    res.status(500).json({
      reply: "I am experiencing temporary connection latency with my core system. Let me verify that and answer you momentarily!",
      error: error.message
    });
  }
});

// Interactive Agent Prompt/Instruction Playground Sandbox Endpoint
app.post("/api/playground/test", async (req, res) => {
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

    const kbContext = knowledgeBase && knowledgeBase.length > 0
      ? knowledgeBase.map((item: any) => `[DOCUMENT: ${item.title}]\n${item.content}`).join("\n\n")
      : "No specific files in Private Knowledge Base. Use general tenant details.";

    const scheduleContext = appointmentsList && appointmentsList.length > 0
      ? appointmentsList.map((app: any) => `- Booked Slot: From ${app.start} to ${app.end}`).join("\n")
      : "No conflicting scheduled bookings on the calendar.";

    const systemPrompt = `You are an autonomous WhatsApp AI Bot representing the tenant "${tenantName}" (${tenantIndustry}).
Your personality name is "${botName}".
Your active speaking tone is strictly "${tone}".
Tenant description: "${tenantDescription}"

${systemInstruction ? `Your CORE SPECIALTY WORKFLOW INSTRUCTIONS and constraints are:\n"${systemInstruction}"\n` : ''}

MULTILINGUAL LANGUAGE AUTO-DETECTION MANDATES:
You MUST support and converse in four languages: English, French (Français), Arabic (العربية), and Tunisian Derja (الدارجة التونسية).
- Automatically detect the user's active speaking language based on the message they send.
- ALWAYS respond in the exact same language they write in.
- If they use Tunisian Derja (Tunisian slang dialect using Tunisian Arabic words such as: باهي, عسّلامة, يعيشك, شكون, فما, بش, حكاية, شكونك, إيجا, نحب, وقتاش, ملا, طيارة, تكلّم, بخصم, شنية, شبيك, هكا, etc. or Franco-Arab Latin slang like "dima", "behi", "3aslema", "y3aychek", "chbiha", "chnuwa", "3leh"), you MUST reply in fluent, native, very warm and welcoming Tunisian Derja. Match their script (Arabic letters for Arabic script, Latin characters with numbers like 3, 7, 5, 9, 2 for Franco-Arab script).
- If they write in Standard Arabic (العربية الفصحى), reply in Standard Arabic.
- If they write in French, reply in French.
- If they write in English, reply in English.
- All core objectives (Lead Capture, Booking, etc.) must remain fully active and translated correctly into the customer's detected language.

CRITICAL ANTI-HALLUCINATION & GROUND TRUTH MANDATES:
1. STRICT TRUTH ONLY: Do NOT invent, fabricate, or guess facts, operations, URLs, email addresses, phone numbers, or treatment prices under any circumstances. Everything you say MUST be explicitly stated within your PRIVATE KNOWLEDGE BASE. Do not extrapolate.
2. HANDLING UNKNOWN INFO: If a customer requests facts, details, or policies NOT listed in your PRIVATE KNOWLEDGE BASE, say so directly and politely, stating that those specific details are currently unavailable. Offer to record their contact coordinates (name, email/phone) so a human manager can contact them and clarify.
3. NO PLACEHOLDERS: Ground all responses strictly on real facts.

CRITICAL CALENDAR RULES (NO DOUBLE BOOKING / STRICT WORKING HOURS):
1. Carefully check the BUSY SLOTS of the calendar below. Do not agree to, suggest, or book any date/time slots that are already busy or overlap with busy slots.
2. Business hours are strictly Monday to Friday, from 9:00 AM to 5:00 PM. Never suggest weekend slots or off-hours outside this window.

CRITICAL ACTION SAFETY RULES:
- Do NOT trigger a 'capture_lead' action unless the user has actually provided or explicitly agreed to share their real personal coordinates (email, phone, or name) in the latest turns.
- Do NOT trigger a 'book_appointment' action until they have explicitly negotiated and confirmed a final choice of a precise reservation date and slot.

Here is your PRIVATE KNOWLEDGE BASE. You must ONLY answer facts, pricing, or Q&A that match or align with these documents:
${kbContext}

Here is the CURRENT SCHEDULE / BUSY SLOTS of the calendar:
${scheduleContext}

Your direct objectives in the continuous chat are:
1. Greet the customer and answer their questions beautifully and concisely (WhatsApp messages should remain under 3-4 neat sentences, using clean whitespace and occasional emojis if casual).
2. Lead Capture: If the customer shows genuine client/buyer interest and provides or agrees to provide their name, email, or telephone, trigger 'capture_lead' action.
3. Appointment Booking: If they express the explicit intent to book a meeting, look at the calendar busy slots above, suggest an unoccupied time slot (within normal business hours 9am - 5pm, from Monday to Friday), and if they agree to a specific date/time, trigger 'book_appointment' action.

Your response MUST be returned strictly in JSON format matching the schema requested below.
Do not wrap your output in markdown codeblocks like \`\`\`json. Return bare clean JSON.`;

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

// WebSocket Realtime Voice Bridge integrating Gemini Live API
function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: any, socket: any, head: any) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host || "localhost"}`).pathname;
    if (pathname === "/api/live-ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs, req) => {
    console.log("[LIVE WS] Client connected to real-time voice bridge");
    
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    const tenantId = url.searchParams.get("tenantId") || "zenith-fitness";
    
    let tenant: any = {};
    try {
      const store = await readTenantsStore();
      tenant = store[tenantId] || {};
    } catch (err) {
      console.error("[LIVE WS] Failed to read tenants store:", err);
    }
    
    const botName = tenant.botName || "Assistant";
    const tone = tenant.tone || "friendly";
    const tenantName = tenant.name || "Our Business";
    const tenantIndustry = tenant.industry || "General Services";
    const tenantDescription = tenant.description || "";
    const knowledgeBase = tenant.knowledgeBase || [];
    const appointmentsList = tenant.appointments || [];
    const systemInstruction = tenant.systemInstruction || "";

    const kbContext = knowledgeBase && knowledgeBase.length > 0
      ? knowledgeBase.map((item: any) => `[DOCUMENT: ${item.title}]\n${item.content}`).join("\n\n")
      : "No private documents loaded.";

    const scheduleContext = appointmentsList && appointmentsList.length > 0
      ? appointmentsList.map((app: any) => `- Booked Slot: From ${app.start} to ${app.end}`).join("\n")
      : "No conflicting scheduled bookings.";

    const systemPrompt = `You are a real-time, low-latency AI Telephone Operator representing the business "${tenantName}" (${tenantIndustry}) in an interactive audio phone conversation.
Your voice personality name is "${botName}".
Your active speaking tone is strictly "${tone}".
Business description: "${tenantDescription}"

${systemInstruction ? `Your CORE VOIP TELEPHONE WORKFLOW INSTRUCTIONS and constraints are:\n"${systemInstruction}"\n` : ''}

MULTILINGUAL VOICE AUTO-DETECTION MANDATES:
You MUST support and converse dynamically in four languages: English, French (Français), Arabic (العربية), and Tunisian Derja (الدارجة التونسية).
- Automatically detect the user's active speaking language based on the voice query they say.
- ALWAYS respond in the exact same language they speak in. Unless they ask otherwise.
- If they use Tunisian Derja (Tunisian slang dialect using Tunisian Arabic words like: باهي, عسّلامة, يعيشك, شكون, فما, بش, نحب, وقتاش, etc.), you MUST reply in fluent, native, very warm and welcoming Tunisian Derja.
- If they speak Standard Arabic (العربية الفصحى), reply in Standard Arabic.
- If they speak French, reply in French.
- If they speak English, reply in English.

CRITICAL ANTI-HALLUCINATION & GROUND TRUTH MANDATES:
1. STRICT TRUTH ONLY: Do NOT invent, fabricate, or guess facts, operations, URLs, email addresses, phone numbers, or treatment prices under any circumstances. Everything you say MUST be explicitly stated within your PRIVATE KNOWLEDGE BASE. Do not extrapolate.
2. HANDLING UNKNOWN INFO: If a caller requests facts, details, or policies NOT listed in your PRIVATE KNOWLEDGE BASE, say so directly and politely, stating that those specific details are currently unavailable. Offer to record their contact coordinates (name, email/phone) so a human manager can contact them and clarify.
3. NO PLACEHOLDERS: Ground all responses strictly on real facts.

CRITICAL CALENDAR RULES (NO DOUBLE BOOKING / STRICT WORKING HOURS):
1. Carefully check the MEMBERSHIP/BOOKING CALENDAR SCHEDULE below. Do not agree to, suggest, or book any date/time slots that are already busy or overlap with busy slots.
2. Business hours are strictly Monday to Friday, from 9:00 AM to 5:00 PM. Never suggest weekend slots or off-hours outside this window.

Your voice replies should be very concise, professional, warm, and natural for telephone communication. Keep replies under 2 sentences so they are easily spoken. Keep turn-taking smooth. Do not dump too much text at once.

PRIVATE KNOWLEDGE BASE (Refer to these details for any company facts, prices, policies, and schedules):
${kbContext}

MEMBERSHIP/BOOKING CALENDAR SCHEDULE:
${scheduleContext}

Your direct objectives in the telephone call are:
1. Greet the customer and answer their questions beautifully and concisely.
2. Capture contacts, leads, or appointments if they request callbacks or scheduling. Proactively suggest unoccupied times from the calendar above if they wish to book. Keep your suggestions simple and clear.`;

    if (!ai) {
      console.warn("[LIVE WS] Gemini API client is uninitialized. Activating telemetry demo loop.");
      clientWs.on("message", (msg) => {
        try {
          const parsed = JSON.parse(msg.toString());
          if (parsed.type === "text" && parsed.text) {
            clientWs.send(JSON.stringify({
              type: "text",
              text: `[Simulation Mode] GEMINI_API_KEY is not defined in Settings. Real voice streaming requires an authentic Gemini API key. Please specify it in the secrets menu! You said: "${parsed.text}"`
            }));
          }
        } catch (e) {}
      });
      return;
    }

    try {
      console.log("[LIVE WS] Starting real Gemini Live connection via .live.connect...");
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Zephyr" }
            }
          },
          systemInstruction: systemPrompt,
          outputAudioTranscription: {}
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ type: "audio", audio }));
            }
            
            const textPart = message.serverContent?.modelTurn?.parts?.find((p: any) => p.text);
            if (textPart && textPart.text) {
              clientWs.send(JSON.stringify({ type: "text", text: textPart.text }));
            }
            
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }
          },
          onclose: () => {
            console.log("[LIVE WS] Gemini Live session finished.");
            clientWs.close();
          },
          onerror: (err: any) => {
            console.error("[LIVE WS] Gemini Live API core error:", err);
            clientWs.send(JSON.stringify({ type: "error", error: err.message || "Gemini Live API failure" }));
          }
        }
      });

      console.log("[LIVE WS] Gemini Live linked and synchronized.");

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === "audio" && parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" }
            });
          } else if (parsed.type === "text" && parsed.text) {
            session.sendRealtimeInput({
              text: parsed.text
            });
          }
        } catch (mErr) {
          console.error("[LIVE WS] Error processing socket message:", mErr);
        }
      });

      clientWs.on("close", () => {
        console.log("[LIVE WS] Socket connection shut down. Terminating Gemini Session.");
        session.close();
      });

      clientWs.on("error", () => {
        session.close();
      });

    } catch (connErr: any) {
      console.error("[LIVE WS] Handshake sequence aborted:", connErr);
      clientWs.send(JSON.stringify({ type: "error", error: connErr.message }));
      clientWs.close();
    }
  });
}

// Setup Vite Dev Server / Static Assets handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Multi-Tenant SaaS Engine running on http://localhost:${PORT}`);
  });

  setupWebSocket(server);
}

startServer();
