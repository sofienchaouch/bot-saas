import { WebSocketServer } from "ws";
import { Modality } from "@google/genai";
import { ai } from "./gemini";
import { readTenantsStore } from "./db";
import { buildSystemPrompt } from "./promptBuilder";

// Transcoding helpers for Twilio VoIP G.711 mu-law <-> PCM 16kHz
const muLawToPcmTable = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  let raw = ~i;
  let sign = raw & 0x80;
  let exponent = (raw & 0x70) >> 4;
  let mantissa = raw & 0x0F;
  let sample = (mantissa << 3) + 132;
  sample <<= exponent;
  sample -= 132;
  muLawToPcmTable[i] = sign ? -sample : sample;
}

function decodeMuLawToPcm16k(muLawBuffer: Buffer): Buffer {
  const outLen = muLawBuffer.length * 4;
  const outBuf = Buffer.alloc(outLen);
  let outIdx = 0;

  for (let i = 0; i < muLawBuffer.length; i++) {
    const currentSample = muLawToPcmTable[muLawBuffer[i]];
    const nextSample = i < muLawBuffer.length - 1 ? muLawToPcmTable[muLawBuffer[i + 1]] : currentSample;

    // Sample 1
    outBuf.writeInt16LE(currentSample, outIdx);
    outIdx += 2;

    // Sample 2 (linear interpolation)
    const midSample = Math.round((currentSample + nextSample) / 2);
    outBuf.writeInt16LE(midSample, outIdx);
    outIdx += 2;
  }

  return outBuf;
}

function encodePcmSampleToMuLaw(sample: number): number {
  const sign = (sample < 0) ? 0x80 : 0x00;
  if (sample < 0) sample = -sample;
  if (sample > 32635) sample = 32635;
  sample += 132;
  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; mask >>= 1) {
    exponent--;
  }
  const mantissa = (sample >> (exponent + 3)) & 0x0F;
  return ~(sign | (exponent << 4) | mantissa) & 0xFF;
}

function encodePcm16kToMuLaw(pcmBuffer: Buffer): Buffer {
  const outLen = Math.floor(pcmBuffer.length / 4);
  const outBuf = Buffer.alloc(outLen);
  let outIdx = 0;

  for (let i = 0; i < pcmBuffer.length; i += 4) {
    if (i + 2 >= pcmBuffer.length) break;
    const sample1 = pcmBuffer.readInt16LE(i);
    const sample2 = pcmBuffer.readInt16LE(i + 2);
    const avgSample = Math.round((sample1 + sample2) / 2);
    outBuf[outIdx++] = encodePcmSampleToMuLaw(avgSample);
  }

  return outBuf;
}

export function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ noServer: true });
  const twilioWss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: any, socket: any, head: any) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host || "localhost"}`).pathname;
    if (pathname === "/api/live-ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else if (pathname === "/api/twilio-voice") {
      twilioWss.handleUpgrade(request, socket, head, (ws) => {
        twilioWss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Live Web client handler
  wss.on("connection", async (clientWs, req) => {
    console.log("[LIVE WS] Client connected to real-time voice bridge");
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    const tenantId = url.searchParams.get("tenantId") || "zenith-fitness";
    await handleVoiceBridgeConnection(clientWs, tenantId, false);
  });

  // Twilio Voice handler
  twilioWss.on("connection", async (clientWs, req) => {
    console.log("[TWILIO WS] Twilio stream connected to real-time voice bridge");
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    const tenantId = url.searchParams.get("tenantId") || "zenith-fitness";
    await handleVoiceBridgeConnection(clientWs, tenantId, true);
  });

  async function handleVoiceBridgeConnection(clientWs: any, tenantId: string, isTwilio: boolean) {
    let tenant: any = {};
    try {
      const store = await readTenantsStore();
      tenant = store[tenantId] || {};
    } catch (err) {
      console.error(`[VOICE WS] Failed to read tenants store for "${tenantId}":`, err);
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

    const additionalVoiceRules = `\n\nCRITICAL ANTI-HALLUCINATION & GROUND TRUTH MANDATES:
1. STRICT TRUTH ONLY: Do NOT invent, fabricate, or guess facts, operations, URLs, email addresses, phone numbers, or treatment prices under any circumstances. Everything you say MUST be explicitly stated within your PRIVATE KNOWLEDGE BASE. Do not extrapolate.
2. HANDLING UNKNOWN INFO: If a caller requests facts, details, or policies NOT listed in your PRIVATE KNOWLEDGE BASE, say so directly and politely, stating that those specific details are currently unavailable. Offer to record their contact coordinates (name, email/phone) so a human manager can contact them and clarify.
3. NO PLACEHOLDERS: Ground all responses strictly on real facts.

CRITICAL CALENDAR RULES (NO DOUBLE BOOKING / STRICT WORKING HOURS):
1. Carefully check the MEMBERSHIP/BOOKING CALENDAR SCHEDULE below. Do not agree to, suggest, or book any date/time slots that are already busy or overlap with busy slots.
2. Business hours are strictly Monday to Friday, from 9:00 AM to 5:00 PM. Never suggest weekend slots or off-hours outside this window.

Your voice replies should be very concise, professional, warm, and natural for telephone communication. Keep replies under 2 sentences so they are easily spoken. Keep turn-taking smooth. Do not dump too much text at once.

PRIVATE KNOWLEDGE BASE (Refer to these details for any company facts, prices, policies, and schedules):
\${kbContext}

MEMBERSHIP/BOOKING CALENDAR SCHEDULE:
\${scheduleContext}

Your direct objectives in the telephone call are:
1. Greet the customer and answer their questions beautifully and concisely.
2. Capture contacts, leads, or appointments if they request callbacks or scheduling. Proactively suggest unoccupied times from the calendar above if they wish to book. Keep your suggestions simple and clear.`;

    const systemPrompt = buildSystemPrompt({
      channel: `real-time, low-latency AI Telephone Operator representing the business "${tenantName}" (${tenantIndustry}) in an interactive audio phone conversation`,
      tenantName,
      tenantIndustry,
      botName,
      tone,
      tenantDescription,
      systemInstruction,
      kbContext,
      scheduleContext,
      additionalRules: additionalVoiceRules
    });

    if (!ai) {
      console.warn("[VOICE WS] Gemini API client is uninitialized. Activating telemetry demo loop.");
      clientWs.on("message", (msg: any) => {
        try {
          if (isTwilio) {
            const parsed = JSON.parse(msg.toString());
            if (parsed.event === "media") {
              // Echo mock response or log
            }
          } else {
            const parsed = JSON.parse(msg.toString());
            if (parsed.type === "text" && parsed.text) {
              clientWs.send(JSON.stringify({
                type: "text",
                text: `[Simulation Mode] GEMINI_API_KEY is not defined in Settings. Real voice streaming requires an authentic Gemini API key. Please specify it in the secrets menu! You said: "${parsed.text}"`
              }));
            }
          }
        } catch (e) {}
      });
      return;
    }

    try {
      console.log(`[VOICE WS] Starting real Gemini Live connection via .live.connect (Twilio=${isTwilio})...`);
      
      let streamSid = "";

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: tenant.twilioVoiceName || "Zephyr" }
            }
          },
          systemInstruction: systemPrompt,
          outputAudioTranscription: {}
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              if (isTwilio) {
                // Transcode from PCM 16kHz to Mu-law 8kHz
                const pcmBuf = Buffer.from(audio, "base64");
                const muLawBuf = encodePcm16kToMuLaw(pcmBuf);
                const base64MuLaw = muLawBuf.toString("base64");

                clientWs.send(JSON.stringify({
                  event: "media",
                  streamSid: streamSid,
                  media: {
                    payload: base64MuLaw
                  }
                }));
              } else {
                clientWs.send(JSON.stringify({ type: "audio", audio }));
              }
            }
            
            const textPart = message.serverContent?.modelTurn?.parts?.find((p: any) => p.text);
            if (textPart && textPart.text) {
              if (!isTwilio) {
                clientWs.send(JSON.stringify({ type: "text", text: textPart.text }));
              }
            }
            
            if (message.serverContent?.interrupted) {
              if (isTwilio) {
                clientWs.send(JSON.stringify({
                  event: "clear",
                  streamSid: streamSid
                }));
              } else {
                clientWs.send(JSON.stringify({ type: "interrupted" }));
              }
            }
          },
          onclose: () => {
            console.log("[VOICE WS] Gemini Live session finished.");
            clientWs.close();
          },
          onerror: (err: any) => {
            console.error("[VOICE WS] Gemini Live API core error:", err);
            if (!isTwilio) {
              clientWs.send(JSON.stringify({ type: "error", error: err.message || "Gemini Live API failure" }));
            }
          }
        }
      });

      console.log("[VOICE WS] Gemini Live linked and synchronized.");

      clientWs.on("message", (data: any) => {
        try {
          if (isTwilio) {
            const parsed = JSON.parse(data.toString());
            if (parsed.event === "start") {
              streamSid = parsed.start.streamSid;
              console.log(`[TWILIO WS] Call stream started. streamSid: ${streamSid}`);
            } else if (parsed.event === "media" && parsed.media?.payload) {
              // Transcode inbound audio from Mu-law 8kHz to PCM 16kHz
              const muLawBuf = Buffer.from(parsed.media.payload, "base64");
              const pcmBuf = decodeMuLawToPcm16k(muLawBuf);
              const base64Pcm = pcmBuf.toString("base64");

              session.sendRealtimeInput({
                audio: { data: base64Pcm, mimeType: "audio/pcm;rate=16000" }
              });
            } else if (parsed.event === "stop") {
              console.log(`[TWILIO WS] Call stream stopped. streamSid: ${streamSid}`);
              session.close();
            }
          } else {
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
          }
        } catch (mErr) {
          console.error("[VOICE WS] Error processing socket message:", mErr);
        }
      });

      clientWs.on("close", () => {
        console.log("[VOICE WS] Socket connection shut down. Terminating Gemini Session.");
        session.close();
      });

      clientWs.on("error", () => {
        session.close();
      });

    } catch (connErr: any) {
      console.error("[VOICE WS] Handshake sequence aborted:", connErr);
      if (!isTwilio) {
        clientWs.send(JSON.stringify({ type: "error", error: connErr.message }));
      }
      clientWs.close();
    }
  }
}
