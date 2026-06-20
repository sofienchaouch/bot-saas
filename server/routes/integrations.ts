import express from "express";
import { Type } from "@google/genai";
import { readTenantsStore, writeTenantsStore } from "../services/db";
import { getRAGContext } from "../services/rag";
import { buildSystemPrompt } from "../services/promptBuilder";
import { ai } from "../services/gemini";

const router = express.Router();

// Health check endpoint
router.get("/api/health", (req, res) => {
  res.json({ status: "ok", aiEnabled: !!ai });
});

// Main autonomous WhatsApp Agent reasoning API Endpoint (Simulator Playground/Web Chat)
router.post("/api/chat", async (req, res) => {
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
    const lastMessage = messages[messages.length - 1]?.text || "";
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

// Twilio Voice Webhook TwiML response
router.post(["/api/twilio/voice", "/api/twilio/voice/:tenantId"], async (req, res) => {
  const tenantId = req.params.tenantId || req.query.tenantId || "zenith-fitness";
  const host = req.headers.host || "localhost:3000";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "ws" : "wss";
  const streamUrl = `${protocol}://${host}/api/twilio-voice?tenantId=${tenantId}`;

  res.type("text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you to our virtual assistant.</Say>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>`);
});

// Public Appointment Booking Endpoint (bypasses authMiddleware)
router.post("/api/tenant/:tenantId/appointment", async (req, res) => {
  const { tenantId } = req.params;
  const { customerName, customerPhone, email, start, end, summary } = req.body;

  if (!customerName || !customerPhone || !email || !start || !end) {
    return res.status(400).json({ error: "Missing required booking details." });
  }

  const store = await readTenantsStore();
  const tenant = store[tenantId];
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found." });
  }

  if (!tenant.appointments) {
    tenant.appointments = [];
  }

  const overlaps = tenant.appointments.some((app: any) => {
    const startA = new Date(app.start).getTime();
    const endA = new Date(app.end).getTime();
    const startB = new Date(start).getTime();
    const endB = new Date(end).getTime();
    return startA < endB && endA > startB;
  });

  if (overlaps) {
    return res.status(409).json({ error: "This slot is already booked. Please choose another slot." });
  }

  const newAppt = {
    id: `appt-web-${Math.floor(100000 + Math.random() * 900000)}`,
    customerName,
    customerPhone,
    email,
    start,
    end,
    summary: summary || "Online Booking Consultation",
    syncedWithGoogle: false
  };

  tenant.appointments.push(newAppt);

  // Auto-qualify Lead inside CRM pipeline
  if (!tenant.leads) {
    tenant.leads = [];
  }
  const leadExists = tenant.leads.some((l: any) => 
    (email && l.email && l.email.toLowerCase() === email.toLowerCase()) || 
    (customerPhone && l.phone === customerPhone)
  );
  if (!leadExists) {
    const newLead = {
      id: `lead-web-${Math.floor(100000 + Math.random() * 900000)}`,
      name: customerName,
      phone: customerPhone,
      email: email,
      status: "Qualified" as const,
      dateCaptured: new Date().toISOString(),
      note: `Auto-qualified via public calendar booking slot: ${new Date(start).toLocaleString()}`
    };
    tenant.leads.push(newLead);
    console.log(`[ONLINE BOOKING] Auto-created qualified lead for "${customerName}"`);
  }

  await writeTenantsStore(store);

  console.log(`[ONLINE BOOKING] Registered appointment for "${customerName}" under tenant "${tenantId}"`);
  res.json({ status: "success", appointment: newAppt });
});

export default router;
