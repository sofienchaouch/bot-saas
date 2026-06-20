import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

// pgvector custom column type (768 dimensions = Gemini text-embedding-004)
const vector = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 768})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(",").map(Number);
  },
});

// ── Tenants ──────────────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull().default(""),
  description: text("description").notNull().default(""),
  avatar: text("avatar").notNull().default("🤖"),
  botName: text("bot_name").notNull().default("Aura"),
  tone: text("tone").notNull().default("professional"),
  status: text("status").notNull().default("active"),
  systemInstruction: text("system_instruction"),
  activeWelcomeTemplateId: text("active_welcome_template_id"),
  // WhatsApp
  whatsAppPhoneNumber: text("whatsapp_phone_number"),
  whatsAppVerifiedSid: text("whatsapp_verified_sid"),
  whatsAppStatus: text("whatsapp_status").default("disconnected"),
  whatsAppApiKeyEnc: text("whatsapp_api_key_enc"),   // AES-256-CBC encrypted
  whatsAppSandboxActive: boolean("whatsapp_sandbox_active").default(false),
  whatsAppSandboxNumbers: jsonb("whatsapp_sandbox_numbers").$type<string[]>().default([]),
  whatsAppTestMode: boolean("whatsapp_test_mode").default(false),
  // Messenger
  messengerPageId: text("messenger_page_id"),
  messengerTokenEnc: text("messenger_token_enc"),    // AES-256-CBC encrypted
  messengerStatus: text("messenger_status").default("disconnected"),
  messengerSandboxActive: boolean("messenger_sandbox_active").default(false),
  messengerSandboxNumbers: jsonb("messenger_sandbox_numbers").$type<string[]>().default([]),
  messengerVoiceEnabled: boolean("messenger_voice_enabled").default(false),
  // Config
  activeAgentId: text("active_agent_id"),
  googleCalendarAutoSchedule: boolean("google_calendar_auto_schedule").default(false),
  twilioVoiceActive: boolean("twilio_voice_active").default(false),
  twilioVoiceName: text("twilio_voice_name"),
  crawlSchedule: text("crawl_schedule").default("none"),
  lastCrawlTime: timestamp("last_crawl_time", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Welcome Templates ─────────────────────────────────────────────────────────

export const welcomeTemplates = pgTable("welcome_templates", {
  id: text("id").notNull(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  text: text("text").notNull(),
}, (t) => [primaryKey({ columns: [t.id, t.tenantId] })]);

// ── Agents ────────────────────────────────────────────────────────────────────

export const agents = pgTable("agents", {
  id: text("id").notNull(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull().default("Support"),
  tone: text("tone").notNull().default("professional"),
  systemInstruction: text("system_instruction").notNull().default(""),
  avatar: text("avatar").notNull().default("🤖"),
  isCustom: boolean("is_custom").default(false),
  voiceEnabled: boolean("voice_enabled").default(false),
}, (t) => [primaryKey({ columns: [t.id, t.tenantId] })]);

// ── Leads ─────────────────────────────────────────────────────────────────────

export const leads = pgTable("leads", {
  id: text("id").notNull(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  status: text("status").notNull().default("New"),
  dateCaptured: timestamp("date_captured", { withTimezone: true }).defaultNow(),
  note: text("note"),
}, (t) => [primaryKey({ columns: [t.id, t.tenantId] })]);

// ── Appointments ──────────────────────────────────────────────────────────────

export const appointments = pgTable("appointments", {
  id: text("id").notNull(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  customerName: text("customer_name").notNull().default(""),
  customerPhone: text("customer_phone").notNull().default(""),
  email: text("email").notNull().default(""),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  summary: text("summary").notNull().default(""),
  notes: text("notes"),
  syncedWithGoogle: boolean("synced_with_google").default(false),
  googleEventId: text("google_event_id"),
}, (t) => [primaryKey({ columns: [t.id, t.tenantId] })]);

// ── Knowledge Base Documents ──────────────────────────────────────────────────

export const kbDocuments = pgTable("kb_documents", {
  id: text("id").notNull(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("document"),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  dateAdded: timestamp("date_added", { withTimezone: true }).defaultNow(),
  fileType: text("file_type"),
  fileSize: text("file_size"),
  url: text("url"),
  crawlDepth: integer("crawl_depth"),
  crawlStatus: text("crawl_status"),
  crawlPagesCount: integer("crawl_pages_count"),
  socialNetwork: text("social_network"),
}, (t) => [primaryKey({ columns: [t.id, t.tenantId] })]);

// ── Knowledge Base Chunks + pgvector ─────────────────────────────────────────

export const kbChunks = pgTable("kb_chunks", {
  id: serial("id").primaryKey(),
  documentId: text("document_id").notNull(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  chunkText: text("chunk_text").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
}, (t) => [
  index("kb_chunks_tenant_idx").on(t.tenantId),
]);

// ── Conversations (JSONB blob for messages — avoids restructuring route logic) ─

export const conversations = pgTable("conversations", {
  key: text("key").primaryKey(),   // format: `${tenantId}_${customerId}`
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),   // full conversation object including messages[]
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("conversations_tenant_idx").on(t.tenantId),
]);

// ── Analytics Events ──────────────────────────────────────────────────────────

export const analyticsEvents = pgTable("analytics_events", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
  channel: text("channel").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
}, (t) => [
  index("analytics_events_tenant_ts_idx").on(t.tenantId, t.timestamp),
]);

// ── Webhook Events ────────────────────────────────────────────────────────────

export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
  channel: text("channel").notNull(),
  direction: text("direction").notNull(),
  status: text("status").notNull(),
  durationMs: integer("duration_ms").notNull().default(0),
  payload: jsonb("payload").notNull().default({}),
  errorMessage: text("error_message"),
  senderPhone: text("sender_phone"),
  messagePreview: text("message_preview"),
}, (t) => [
  index("webhook_events_tenant_ts_idx").on(t.tenantId, t.timestamp),
]);
