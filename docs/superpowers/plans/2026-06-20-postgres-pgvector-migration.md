# PostgreSQL + pgvector Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all JSON file and Firestore storage with a single PostgreSQL 17 + pgvector database, enabling proper relational multi-tenant isolation and ANN vector search for RAG.

**Architecture:** One `pgvector/pgvector:pg17` Docker service. Drizzle ORM manages schema + migrations. The existing `db.ts` public API surface (`readTenantsStore`/`writeTenantsStore`/`readConversationsStore`/`writeConversationsStore`) is preserved to minimize blast radius on routes. `analytics.ts` and `webhookLogger.ts` replace sync file I/O with async PostgreSQL writes. `rag.ts` gains a `getRAGContext(query, tenantId, filter?)` signature that uses the pgvector `<=>` operator instead of brute-force O(n) JS loops. When `DATABASE_URL` is absent (test-only mode without Docker), all services fall back to in-memory Maps so the vitest suite can run without a live database.

**Tech Stack:** PostgreSQL 17, pgvector extension, `drizzle-orm` + `drizzle-kit`, `pg` (node-postgres), `pgvector` npm package (drizzle vector column type helper).

## Global Constraints

- `npm install` MUST include `--legacy-peer-deps` (Firebase ESLint plugin conflict).
- Preserve exact export signatures of `db.ts`, `analytics.ts`, `webhookLogger.ts` — except `getAnalytics` and `getWebhookEvents` which return `Promise<...>` instead of values (their two call sites in `admin.ts` get an `await`).
- `getRAGContext` changes signature from `(query, knowledgeBase, filter?)` to `(query, tenantId, filter?)` — update all 6 call sites across `webhooks.ts`, `integrations.ts`, `admin.ts`.
- `NODE_ENV=test` without `DATABASE_URL` → in-memory fallback. All 24 existing tests must continue to pass.
- `npm run test && npm run build` must both pass at the end of every task that touches server code.
- `.env` is never committed. Only `.env.example` changes.
- Secrets (`whatsAppApiKey`, `messengerToken`) continue to be AES-256-CBC encrypted at rest via the existing `encryption.ts` helpers before being written to PostgreSQL columns.

---

## File Map

### New files
| Path | Responsibility |
|------|----------------|
| `drizzle.config.ts` | drizzle-kit configuration (dialect, schema, migrations output dir) |
| `server/db/schema.ts` | All Drizzle table definitions (tenants, leads, appointments, agents, welcome\_templates, kb\_documents, kb\_chunks, conversations, analytics\_events, webhook\_events) |
| `server/db/index.ts` | `pg.Pool` + `drizzle(pool)` client export; reads `DATABASE_URL` from config |
| `server/db/migrate.ts` | `runMigrations()` — called at app startup, runs pending drizzle migrations |
| `drizzle/` | Auto-generated SQL migrations (created by `drizzle-kit generate`) |
| `scripts/migrate-json-to-pg.ts` | One-time import of `tenants_store.json` + `webhook_conversations.json` into PostgreSQL |

### Modified files
| Path | What changes |
|------|-------------|
| `package.json` | Add `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`, `pgvector` |
| `docker-compose.yml` | Add `db` service (`pgvector/pgvector:pg17`); `app`/`app-dev` depend on it |
| `.env.example` | Add `DATABASE_URL=postgres://aura:aura@localhost:5432/aura` |
| `server/config.ts` | Add `DATABASE_URL` to Zod schema (optional string) |
| `server/services/db.ts` | Replace Firebase/JSON logic; keep same exports; add in-memory fallback when `DATABASE_URL` not set |
| `server/services/analytics.ts` | Replace file I/O with PostgreSQL; `getAnalytics` → `async`; in-memory fallback |
| `server/services/webhookLogger.ts` | Replace file I/O with PostgreSQL; `getWebhookEvents` → `async`; in-memory fallback |
| `server/services/rag.ts` | `getRAGContext(query, tenantId, filter?)` uses pgvector; in-memory fallback |
| `server/routes/admin.ts` | `await getAnalytics(...)`, `await getWebhookEvents(...)`, update `getRAGContext` call |
| `server/routes/webhooks.ts` | Update 4 `getRAGContext` call sites (remove `knowledgeBase` arg, pass `tenantId`) |
| `server/routes/integrations.ts` | Update 1 `getRAGContext` call site |

---

## Task 1: Install packages + Docker Compose + Config

**Files:**
- Modify: `package.json`
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `server/config.ts`

**Interfaces:**
- Produces: `DATABASE_URL` env var available throughout the server; `db` Docker service ready for Tasks 2+

- [ ] **Step 1: Install new dependencies**

```bash
npm install --legacy-peer-deps drizzle-orm pg pgvector
npm install --legacy-peer-deps --save-dev drizzle-kit @types/pg
```

Expected output: no peer-dep errors. `package.json` now contains `"drizzle-orm"`, `"pg"`, `"pgvector"` in dependencies and `"drizzle-kit"`, `"@types/pg"` in devDependencies.

- [ ] **Step 2: Add `DATABASE_URL` to `.env.example`**

Append this line to `.env.example`:

```
DATABASE_URL=postgres://aura:aura@localhost:5432/aura
```

- [ ] **Step 3: Add `DATABASE_URL` to Zod schema in `server/config.ts`**

In `server/config.ts`, locate the `envSchema` object and add one line:

```typescript
// existing fields...
DATABASE_URL: z.string().optional(),
```

Then export it at the bottom alongside existing exports:

```typescript
export const { ENCRYPTION_KEY, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, PORT, NODE_ENV, APP_URL, GEMINI_API_KEY, DATABASE_URL } = parsedEnv.data;
```

- [ ] **Step 4: Update `docker-compose.yml` — add `db` service**

Replace the entire `docker-compose.yml` with the content below (adds `db` service, `pgdata` volume, and `depends_on` for `app` and `app-dev`):

```yaml
# ─────────────────────────────────────────────────────────────────────────────
# Aura Platform — Docker Compose
#
# Profiles:
#   (default)  docker compose up               → production build + Nginx
#   dev        docker compose --profile dev up → tsx dev server, hot-reload via volumes
#
# Quick start:
#   1. cp .env.example .env && fill in secrets
#   2. docker compose up --build
# ─────────────────────────────────────────────────────────────────────────────

services:

  # ── PostgreSQL + pgvector ───────────────────────────────────────────────────
  db:
    image: pgvector/pgvector:pg17
    container_name: aura-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: aura
      POSTGRES_USER: aura
      POSTGRES_PASSWORD: ${DB_PASSWORD:-aura}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"          # expose for local dev/migrations
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aura -d aura"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - aura-net

  # ── App (Production) ────────────────────────────────────────────────────────
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: aura-app
    restart: unless-stopped
    env_file: .env
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgres://aura:${DB_PASSWORD:-aura}@db:5432/aura
    ports:
      - "3000:3000"
    volumes:
      - aura-data:/app/data
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    networks:
      - aura-net
    profiles: ["", "prod"]

  # ── App (Development — hot-reload) ──────────────────────────────────────────
  app-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: aura-app-dev
    restart: unless-stopped
    env_file: .env
    environment:
      NODE_ENV: development
      PORT: 3000
      DISABLE_HMR: "false"
      DATABASE_URL: postgres://aura:${DB_PASSWORD:-aura}@db:5432/aura
    ports:
      - "3000:3000"
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
      - aura-data:/app/data
    command: npm run dev
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
    networks:
      - aura-net
    profiles: ["dev"]

  # ── Nginx Reverse Proxy ──────────────────────────────────────────────────────
  nginx:
    image: nginx:1.27-alpine
    container_name: aura-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      app:
        condition: service_healthy
    networks:
      - aura-net
    profiles: ["prod", "nginx"]

# ── Named Volumes ──────────────────────────────────────────────────────────────
volumes:
  pgdata:
    driver: local
  aura-data:
    driver: local

# ── Networks ──────────────────────────────────────────────────────────────────
networks:
  aura-net:
    driver: bridge
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: no errors referencing `DATABASE_URL`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json docker-compose.yml .env.example server/config.ts
git commit -m "feat: add PostgreSQL+pgvector to Docker Compose and install drizzle deps"
```

---

## Task 2: Drizzle schema + DB client + drizzle.config.ts

**Files:**
- Create: `drizzle.config.ts`
- Create: `server/db/schema.ts`
- Create: `server/db/index.ts`
- Create: `server/db/migrate.ts`

**Interfaces:**
- Produces:
  - `db` — default export from `server/db/index.ts`, a `drizzle(pool)` instance
  - `pool` — named export from `server/db/index.ts`, the `pg.Pool` instance
  - `isDbAvailable()` — exported boolean function, returns true if `DATABASE_URL` is set
  - All table exports from `server/db/schema.ts`
  - `runMigrations()` — exported from `server/db/migrate.ts`

- [ ] **Step 1: Create `drizzle.config.ts` at project root**

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://aura:aura@localhost:5432/aura",
  },
} satisfies Config;
```

- [ ] **Step 2: Create `server/db/schema.ts`**

```typescript
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
```

- [ ] **Step 3: Create `server/db/index.ts`**

```typescript
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { DATABASE_URL } from "../config";

export function isDbAvailable(): boolean {
  return !!DATABASE_URL;
}

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new pg.Pool({ connectionString: DATABASE_URL! });
  }
  return _pool;
}

export { schema };

// Lazily create the drizzle client — only callable when DATABASE_URL is set.
// For in-memory fallback mode (tests without DB), don't call this.
export function getDb() {
  return drizzle(getPool(), { schema });
}

export type Db = ReturnType<typeof getDb>;

// Convenience: close the pool (useful in test teardown)
export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
```

- [ ] **Step 4: Create `server/db/migrate.ts`**

```typescript
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, isDbAvailable } from "./index";
import path from "path";

export async function runMigrations(): Promise<void> {
  if (!isDbAvailable()) {
    console.log("[DB] DATABASE_URL not set — skipping migrations (in-memory mode).");
    return;
  }
  try {
    const db = getDb();
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
    console.log("[DB] Migrations applied successfully.");
  } catch (err) {
    console.error("[DB] Migration failed:", err);
    throw err;
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles (no runtime yet — DB not running)**

```bash
npm run lint
```

Expected: no type errors in the new files.

- [ ] **Step 6: Commit**

```bash
git add drizzle.config.ts server/db/schema.ts server/db/index.ts server/db/migrate.ts
git commit -m "feat: add Drizzle schema, DB client, and migration runner"
```

---

## Task 3: Generate and apply initial migration

**Files:**
- Create: `drizzle/` (auto-generated by drizzle-kit)

**Interfaces:**
- Consumes: `drizzle.config.ts`, `server/db/schema.ts`, running PostgreSQL at `DATABASE_URL`
- Produces: `drizzle/0000_initial.sql` migration file; tables exist in the database

- [ ] **Step 1: Start the PostgreSQL container (or have local PostgreSQL running)**

If using Docker:
```bash
docker compose up db -d
```

Wait for healthy:
```bash
docker compose ps db
# STATUS column should show "healthy"
```

If using a local PostgreSQL installation, ensure a database `aura` exists:
```sql
CREATE DATABASE aura;
```

Set `DATABASE_URL` in your local `.env` file:
```
DATABASE_URL=postgres://aura:aura@localhost:5432/aura
```

- [ ] **Step 2: Enable pgvector extension in the database**

```bash
docker compose exec db psql -U aura -d aura -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Or if using local PostgreSQL:
```bash
psql -U aura -d aura -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Expected: `CREATE EXTENSION`

- [ ] **Step 3: Generate the initial migration**

```bash
npx drizzle-kit generate
```

Expected: creates `drizzle/0000_<name>.sql` containing `CREATE TABLE` statements for all tables plus `CREATE INDEX` statements.

Open `drizzle/0000_<name>.sql` and verify it contains:
- `CREATE TABLE tenants`
- `CREATE TABLE kb_chunks` with `embedding vector(768)`
- All index definitions

- [ ] **Step 4: Apply the migration**

```bash
npx drizzle-kit migrate
```

Expected: `All migrations applied`

- [ ] **Step 5: Verify pgvector works**

```bash
docker compose exec db psql -U aura -d aura -c "\d kb_chunks"
```

Expected output includes: `embedding | vector(768)`

- [ ] **Step 6: Commit**

```bash
git add drizzle/
git commit -m "feat: generate and apply initial PostgreSQL+pgvector migration"
```

---

## Task 4: Rewrite `server/services/db.ts` with PostgreSQL backend

The public API surface is unchanged: `readTenantsStore`, `writeTenantsStore`, `readConversationsStore`, `writeConversationsStore`. When `DATABASE_URL` is not set, in-memory Maps serve as fallback for tests.

**Files:**
- Modify: `server/services/db.ts`

**Interfaces:**
- Consumes: `server/db/index.ts` (`getDb`, `isDbAvailable`, `schema`)
- Produces: same 4 exports as before (no route changes needed)

- [ ] **Step 1: Replace the full content of `server/services/db.ts`**

```typescript
import { eq, and, inArray } from "drizzle-orm";
import { getDb, isDbAvailable, schema } from "../db/index";
import { encryptTenant, decryptTenant } from "./encryption";
import type { Tenant, Lead, Appointment, KnowledgeBaseItem, Agent, WelcomeTemplate } from "../../src/types";

// ── In-memory fallback (used when DATABASE_URL is not set, e.g. vitest without Docker) ──

const _memTenants: Map<string, any> = new Map();
const _memConversations: Map<string, any> = new Map();

// ── Tenant assembly helpers ────────────────────────────────────────────────────

function rowToTenant(
  row: typeof schema.tenants.$inferSelect,
  wts: (typeof schema.welcomeTemplates.$inferSelect)[],
  agts: (typeof schema.agents.$inferSelect)[],
  lds: (typeof schema.leads.$inferSelect)[],
  apts: (typeof schema.appointments.$inferSelect)[],
  docs: (typeof schema.kbDocuments.$inferSelect)[]
): Tenant {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    description: row.description,
    avatar: row.avatar,
    botName: row.botName,
    tone: row.tone as Tenant["tone"],
    status: row.status as Tenant["status"],
    systemInstruction: row.systemInstruction ?? undefined,
    activeWelcomeTemplateId: row.activeWelcomeTemplateId ?? undefined,
    welcomeTemplates: wts.map((w) => ({ id: w.id, name: w.name, text: w.text })),
    agents: agts.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      tone: a.tone as Agent["tone"],
      systemInstruction: a.systemInstruction,
      avatar: a.avatar,
      isCustom: a.isCustom ?? undefined,
      voiceEnabled: a.voiceEnabled ?? undefined,
    })),
    leads: lds.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email,
      status: l.status as Lead["status"],
      dateCaptured: l.dateCaptured?.toISOString() ?? new Date().toISOString(),
      note: l.note ?? undefined,
    })),
    appointments: apts.map((a) => ({
      id: a.id,
      customerName: a.customerName,
      customerPhone: a.customerPhone,
      email: a.email,
      start: a.startTime.toISOString(),
      end: a.endTime.toISOString(),
      summary: a.summary,
      notes: a.notes ?? undefined,
      syncedWithGoogle: a.syncedWithGoogle ?? false,
      googleEventId: a.googleEventId ?? undefined,
    })),
    knowledgeBase: docs.map((d) => ({
      id: d.id,
      type: d.type as KnowledgeBaseItem["type"],
      title: d.title,
      content: d.content,
      dateAdded: d.dateAdded?.toISOString() ?? new Date().toISOString(),
      fileType: d.fileType as KnowledgeBaseItem["fileType"] ?? undefined,
      fileSize: d.fileSize ?? undefined,
      url: d.url ?? undefined,
      crawlDepth: d.crawlDepth ?? undefined,
      crawlStatus: d.crawlStatus as KnowledgeBaseItem["crawlStatus"] ?? undefined,
      crawlPagesCount: d.crawlPagesCount ?? undefined,
      socialNetwork: d.socialNetwork as KnowledgeBaseItem["socialNetwork"] ?? undefined,
      chunks: [],   // chunks live in kb_chunks table; not loaded here (RAG queries DB directly)
    })),
    whatsAppPhoneNumber: row.whatsAppPhoneNumber ?? undefined,
    whatsAppVerifiedSid: row.whatsAppVerifiedSid ?? undefined,
    whatsAppStatus: row.whatsAppStatus as Tenant["whatsAppStatus"] ?? undefined,
    // Decrypt secrets on read
    whatsAppApiKey: row.whatsAppApiKeyEnc ? decryptTenant({ whatsAppApiKey: row.whatsAppApiKeyEnc }).whatsAppApiKey : undefined,
    whatsAppSandboxActive: row.whatsAppSandboxActive ?? undefined,
    whatsAppSandboxNumbers: (row.whatsAppSandboxNumbers as string[]) ?? undefined,
    whatsAppTestMode: row.whatsAppTestMode ?? undefined,
    messengerPageId: row.messengerPageId ?? undefined,
    messengerToken: row.messengerTokenEnc ? decryptTenant({ messengerToken: row.messengerTokenEnc }).messengerToken : undefined,
    messengerStatus: row.messengerStatus as Tenant["messengerStatus"] ?? undefined,
    messengerSandboxActive: row.messengerSandboxActive ?? undefined,
    messengerSandboxNumbers: (row.messengerSandboxNumbers as string[]) ?? undefined,
    messengerVoiceEnabled: row.messengerVoiceEnabled ?? undefined,
    activeAgentId: row.activeAgentId ?? undefined,
    googleCalendarAutoSchedule: row.googleCalendarAutoSchedule ?? undefined,
    twilioVoiceActive: row.twilioVoiceActive ?? undefined,
    twilioVoiceName: row.twilioVoiceName ?? undefined,
    crawlSchedule: row.crawlSchedule as Tenant["crawlSchedule"] ?? undefined,
    lastCrawlTime: row.lastCrawlTime?.toISOString() ?? undefined,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function readTenantsStore(): Promise<Record<string, Tenant>> {
  if (!isDbAvailable()) {
    const result: Record<string, Tenant> = {};
    _memTenants.forEach((v, k) => { result[k] = v; });
    return result;
  }

  const db = getDb();
  const tenantRows = await db.select().from(schema.tenants);
  if (tenantRows.length === 0) return {};

  const ids = tenantRows.map((t) => t.id);

  const [wts, agts, lds, apts, docs] = await Promise.all([
    db.select().from(schema.welcomeTemplates).where(inArray(schema.welcomeTemplates.tenantId, ids)),
    db.select().from(schema.agents).where(inArray(schema.agents.tenantId, ids)),
    db.select().from(schema.leads).where(inArray(schema.leads.tenantId, ids)),
    db.select().from(schema.appointments).where(inArray(schema.appointments.tenantId, ids)),
    db.select().from(schema.kbDocuments).where(inArray(schema.kbDocuments.tenantId, ids)),
  ]);

  const result: Record<string, Tenant> = {};
  for (const row of tenantRows) {
    result[row.id] = rowToTenant(
      row,
      wts.filter((w) => w.tenantId === row.id),
      agts.filter((a) => a.tenantId === row.id),
      lds.filter((l) => l.tenantId === row.id),
      apts.filter((a) => a.tenantId === row.id),
      docs.filter((d) => d.tenantId === row.id)
    );
  }
  return result;
}

export async function writeTenantsStore(store: Record<string, any>): Promise<void> {
  if (!isDbAvailable()) {
    Object.entries(store).forEach(([k, v]) => _memTenants.set(k, v));
    return;
  }

  const db = getDb();

  for (const tenant of Object.values(store) as Tenant[]) {
    const encrypted = encryptTenant(tenant) as any;

    // Upsert tenant row
    await db
      .insert(schema.tenants)
      .values({
        id: tenant.id,
        name: tenant.name,
        industry: tenant.industry,
        description: tenant.description,
        avatar: tenant.avatar,
        botName: tenant.botName,
        tone: tenant.tone,
        status: tenant.status,
        systemInstruction: tenant.systemInstruction ?? null,
        activeWelcomeTemplateId: tenant.activeWelcomeTemplateId ?? null,
        whatsAppPhoneNumber: tenant.whatsAppPhoneNumber ?? null,
        whatsAppVerifiedSid: tenant.whatsAppVerifiedSid ?? null,
        whatsAppStatus: tenant.whatsAppStatus ?? "disconnected",
        whatsAppApiKeyEnc: encrypted.whatsAppApiKey ?? null,
        whatsAppSandboxActive: tenant.whatsAppSandboxActive ?? false,
        whatsAppSandboxNumbers: (tenant.whatsAppSandboxNumbers ?? []) as string[],
        whatsAppTestMode: tenant.whatsAppTestMode ?? false,
        messengerPageId: tenant.messengerPageId ?? null,
        messengerTokenEnc: encrypted.messengerToken ?? null,
        messengerStatus: tenant.messengerStatus ?? "disconnected",
        messengerSandboxActive: tenant.messengerSandboxActive ?? false,
        messengerSandboxNumbers: (tenant.messengerSandboxNumbers ?? []) as string[],
        messengerVoiceEnabled: tenant.messengerVoiceEnabled ?? false,
        activeAgentId: tenant.activeAgentId ?? null,
        googleCalendarAutoSchedule: tenant.googleCalendarAutoSchedule ?? false,
        twilioVoiceActive: tenant.twilioVoiceActive ?? false,
        twilioVoiceName: tenant.twilioVoiceName ?? null,
        crawlSchedule: tenant.crawlSchedule ?? "none",
        lastCrawlTime: tenant.lastCrawlTime ? new Date(tenant.lastCrawlTime) : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.tenants.id,
        set: {
          name: tenant.name,
          industry: tenant.industry,
          description: tenant.description,
          avatar: tenant.avatar,
          botName: tenant.botName,
          tone: tenant.tone,
          status: tenant.status,
          systemInstruction: tenant.systemInstruction ?? null,
          activeWelcomeTemplateId: tenant.activeWelcomeTemplateId ?? null,
          whatsAppPhoneNumber: tenant.whatsAppPhoneNumber ?? null,
          whatsAppVerifiedSid: tenant.whatsAppVerifiedSid ?? null,
          whatsAppStatus: tenant.whatsAppStatus ?? "disconnected",
          whatsAppApiKeyEnc: encrypted.whatsAppApiKey ?? null,
          whatsAppSandboxActive: tenant.whatsAppSandboxActive ?? false,
          whatsAppSandboxNumbers: (tenant.whatsAppSandboxNumbers ?? []) as string[],
          whatsAppTestMode: tenant.whatsAppTestMode ?? false,
          messengerPageId: tenant.messengerPageId ?? null,
          messengerTokenEnc: encrypted.messengerToken ?? null,
          messengerStatus: tenant.messengerStatus ?? "disconnected",
          messengerSandboxActive: tenant.messengerSandboxActive ?? false,
          messengerSandboxNumbers: (tenant.messengerSandboxNumbers ?? []) as string[],
          messengerVoiceEnabled: tenant.messengerVoiceEnabled ?? false,
          activeAgentId: tenant.activeAgentId ?? null,
          googleCalendarAutoSchedule: tenant.googleCalendarAutoSchedule ?? false,
          twilioVoiceActive: tenant.twilioVoiceActive ?? false,
          twilioVoiceName: tenant.twilioVoiceName ?? null,
          crawlSchedule: tenant.crawlSchedule ?? "none",
          lastCrawlTime: tenant.lastCrawlTime ? new Date(tenant.lastCrawlTime) : null,
          updatedAt: new Date(),
        },
      });

    // Welcome templates: delete then insert (full replace)
    await db.delete(schema.welcomeTemplates).where(eq(schema.welcomeTemplates.tenantId, tenant.id));
    if (tenant.welcomeTemplates && tenant.welcomeTemplates.length > 0) {
      await db.insert(schema.welcomeTemplates).values(
        tenant.welcomeTemplates.map((w: WelcomeTemplate) => ({ id: w.id, tenantId: tenant.id, name: w.name, text: w.text }))
      );
    }

    // Agents: delete then insert
    await db.delete(schema.agents).where(eq(schema.agents.tenantId, tenant.id));
    if (tenant.agents && tenant.agents.length > 0) {
      await db.insert(schema.agents).values(
        tenant.agents.map((a: Agent) => ({
          id: a.id,
          tenantId: tenant.id,
          name: a.name,
          role: a.role,
          tone: a.tone,
          systemInstruction: a.systemInstruction,
          avatar: a.avatar,
          isCustom: a.isCustom ?? false,
          voiceEnabled: a.voiceEnabled ?? false,
        }))
      );
    }

    // Leads: upsert by (id, tenantId)
    if (tenant.leads && tenant.leads.length > 0) {
      for (const l of tenant.leads as Lead[]) {
        await db
          .insert(schema.leads)
          .values({
            id: l.id,
            tenantId: tenant.id,
            name: l.name,
            phone: l.phone,
            email: l.email,
            status: l.status,
            dateCaptured: new Date(l.dateCaptured),
            note: l.note ?? null,
          })
          .onConflictDoUpdate({
            target: [schema.leads.id, schema.leads.tenantId],
            set: {
              name: l.name,
              phone: l.phone,
              email: l.email,
              status: l.status,
              note: l.note ?? null,
            },
          });
      }
    }

    // Appointments: upsert by (id, tenantId)
    if (tenant.appointments && tenant.appointments.length > 0) {
      for (const a of tenant.appointments as Appointment[]) {
        await db
          .insert(schema.appointments)
          .values({
            id: a.id,
            tenantId: tenant.id,
            customerName: a.customerName,
            customerPhone: a.customerPhone,
            email: a.email,
            startTime: new Date(a.start),
            endTime: new Date(a.end),
            summary: a.summary,
            notes: a.notes ?? null,
            syncedWithGoogle: a.syncedWithGoogle,
            googleEventId: a.googleEventId ?? null,
          })
          .onConflictDoUpdate({
            target: [schema.appointments.id, schema.appointments.tenantId],
            set: {
              customerName: a.customerName,
              customerPhone: a.customerPhone,
              email: a.email,
              startTime: new Date(a.start),
              endTime: new Date(a.end),
              summary: a.summary,
              notes: a.notes ?? null,
              syncedWithGoogle: a.syncedWithGoogle,
              googleEventId: a.googleEventId ?? null,
            },
          });
      }
    }

    // KB Documents: upsert by (id, tenantId); chunks are handled by enrichTenantEmbeddings separately
    if (tenant.knowledgeBase && tenant.knowledgeBase.length > 0) {
      for (const doc of tenant.knowledgeBase as KnowledgeBaseItem[]) {
        await db
          .insert(schema.kbDocuments)
          .values({
            id: doc.id,
            tenantId: tenant.id,
            type: doc.type,
            title: doc.title,
            content: doc.content,
            dateAdded: new Date(doc.dateAdded),
            fileType: doc.fileType ?? null,
            fileSize: doc.fileSize ?? null,
            url: doc.url ?? null,
            crawlDepth: doc.crawlDepth ?? null,
            crawlStatus: doc.crawlStatus ?? null,
            crawlPagesCount: doc.crawlPagesCount ?? null,
            socialNetwork: doc.socialNetwork ?? null,
          })
          .onConflictDoUpdate({
            target: [schema.kbDocuments.id, schema.kbDocuments.tenantId],
            set: {
              type: doc.type,
              title: doc.title,
              content: doc.content,
              fileType: doc.fileType ?? null,
              fileSize: doc.fileSize ?? null,
              url: doc.url ?? null,
              crawlDepth: doc.crawlDepth ?? null,
              crawlStatus: doc.crawlStatus ?? null,
              crawlPagesCount: doc.crawlPagesCount ?? null,
              socialNetwork: doc.socialNetwork ?? null,
            },
          });
      }
    }
  }
}

export async function readConversationsStore(): Promise<Record<string, any>> {
  if (!isDbAvailable()) {
    const result: Record<string, any> = {};
    _memConversations.forEach((v, k) => { result[k] = v; });
    return result;
  }

  const db = getDb();
  const rows = await db.select().from(schema.conversations);
  const result: Record<string, any> = {};
  for (const row of rows) {
    result[row.key] = row.data;
  }
  return result;
}

export async function writeConversationsStore(store: Record<string, any>): Promise<void> {
  if (!isDbAvailable()) {
    Object.entries(store).forEach(([k, v]) => _memConversations.set(k, v));
    return;
  }

  const db = getDb();
  for (const [key, data] of Object.entries(store)) {
    const tenantId = key.split("_")[0];
    await db
      .insert(schema.conversations)
      .values({ key, tenantId, data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.conversations.key,
        set: { data, updatedAt: new Date() },
      });
  }
}

// Exported for test injection
export function _setMemTenant(id: string, tenant: any): void {
  _memTenants.set(id, tenant);
}
export function _clearMemStore(): void {
  _memTenants.clear();
  _memConversations.clear();
}
```

- [ ] **Step 2: Remove the old Firebase imports from db.ts**

The file above has no Firebase Admin imports. If the server.ts or any route currently imports `firestoreDb` or `useLocalFallbackOnly` directly from `db.ts`, grep for those usages:

```bash
grep -r "firestoreDb\|useLocalFallbackOnly\|checkFirestoreConnection" server/ --include="*.ts"
```

If any hits exist outside `db.ts` itself, remove or update those imports. (Expected: 0 hits — the old db.ts was the only file that exported these.)

- [ ] **Step 3: Update tests to use the new in-memory injection API**

Open `tests/backend.test.ts`. Find the `beforeEach` block that writes the test store to a JSON file (lines ~72–100). Replace the JSON file write with the new in-memory helper:

```typescript
import { _setMemTenant, _clearMemStore } from '../server/services/db';

// In beforeEach:
beforeEach(() => {
  _clearMemStore();
  _setMemTenant('test-tenant', {
    id: 'test-tenant',
    name: 'Test Business Corp',
    // ... rest of the mock tenant object (unchanged)
  });
});

// In afterEach: remove the JSON file cleanup code (no longer needed)
afterEach(() => {
  // Remove: fs.unlinkSync(TEST_TENANTS_FILE) etc.
});
```

Also remove these imports from `tests/backend.test.ts` since they're no longer needed:
```typescript
// Remove:
import fs from 'fs';
import path from 'path';
const TEST_TENANTS_FILE = ...
const TEST_CONVERSATIONS_FILE = ...
```

Keep the imports for `readTenantsStore`, `writeTenantsStore`, `readConversationsStore`, `writeConversationsStore` — they still work (just use in-memory now).

- [ ] **Step 4: Run tests to verify in-memory fallback works**

```bash
npm run test
```

Expected: all 24 tests pass. If any test fails because it depended on specific file paths, fix the specific test setup (don't change the test assertions).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add server/services/db.ts tests/backend.test.ts
git commit -m "feat: replace Firebase/JSON db.ts with PostgreSQL + in-memory fallback for tests"
```

---

## Task 5: Replace `analytics.ts` with PostgreSQL backend

**Files:**
- Modify: `server/services/analytics.ts`
- Modify: `server/routes/admin.ts` (add `await` at line 772 and 779)

**Interfaces:**
- Consumes: `server/db/index.ts`
- Produces: same exports as before; `getAnalytics` is now `async`; `recordEvent` is still void (fire-and-forget)

- [ ] **Step 1: Replace the full content of `server/services/analytics.ts`**

```typescript
import { eq, gte, sql } from "drizzle-orm";
import { getDb, isDbAvailable, schema } from "../db/index";

// ── Types (unchanged) ─────────────────────────────────────────────────────────

export type AnalyticsEventType =
  | "message_received"
  | "message_sent"
  | "lead_captured"
  | "appointment_booked"
  | "rag_used"
  | "handoff_triggered"
  | "error";

export interface AnalyticsEvent {
  id: string;
  tenantId: string;
  type: AnalyticsEventType;
  timestamp: string;
  channel: "whatsapp" | "messenger" | "telegram" | "sms" | "simulator";
  metadata: Record<string, unknown>;
}

export interface DailyMetrics {
  date: string;
  messagesReceived: number;
  aiReplies: number;
  humanReplies: number;
  newLeads: number;
  appointmentsBooked: number;
  ragUsed: number;
  handoffs: number;
  errors: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  totalDurationMs: number;
  durationSamples: number;
}

export interface AggregatedAnalytics {
  tenantId: string;
  period: { from: string; to: string; days: number };
  daily: DailyMetrics[];
  totals: Omit<DailyMetrics, "date" | "avgResponseTimeMs" | "p95ResponseTimeMs">;
  topCitations: { url: string; count: number }[];
  containmentRate: number;
  conversionRate: number;
}

// ── In-memory fallback ────────────────────────────────────────────────────────

const _memEvents: Map<string, AnalyticsEvent[]> = new Map();

// ── Public API ─────────────────────────────────────────────────────────────────

/** Fire-and-forget. Never throws. */
export function recordEvent(
  tenantId: string,
  type: AnalyticsEventType,
  channel: AnalyticsEvent["channel"],
  metadata: Record<string, unknown> = {}
): void {
  const event: AnalyticsEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tenantId,
    type,
    timestamp: new Date().toISOString(),
    channel,
    metadata,
  };

  if (!isDbAvailable()) {
    const list = _memEvents.get(tenantId) ?? [];
    list.push(event);
    _memEvents.set(tenantId, list.slice(-10_000));
    return;
  }

  // Async fire-and-forget — don't await
  const db = getDb();
  db.insert(schema.analyticsEvents)
    .values({
      id: event.id,
      tenantId,
      type,
      timestamp: new Date(event.timestamp),
      channel,
      metadata,
    })
    .catch((err) => console.error("[analytics] recordEvent error:", err));
}

export async function getAnalytics(tenantId: string, days = 30): Promise<AggregatedAnalytics> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let events: AnalyticsEvent[];

  if (!isDbAvailable()) {
    const list = _memEvents.get(tenantId) ?? [];
    events = list.filter((e) => new Date(e.timestamp) >= cutoff);
  } else {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.analyticsEvents)
      .where(
        sql`${schema.analyticsEvents.tenantId} = ${tenantId} AND ${schema.analyticsEvents.timestamp} >= ${cutoff}`
      );
    events = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      type: r.type as AnalyticsEventType,
      timestamp: (r.timestamp as Date).toISOString(),
      channel: r.channel as AnalyticsEvent["channel"],
      metadata: r.metadata as Record<string, unknown>,
    }));
  }

  // Aggregation logic unchanged from original
  const buckets = new Map<string, DailyMetrics>();

  for (const evt of events) {
    const date = evt.timestamp.slice(0, 10);
    if (!buckets.has(date)) {
      buckets.set(date, {
        date,
        messagesReceived: 0,
        aiReplies: 0,
        humanReplies: 0,
        newLeads: 0,
        appointmentsBooked: 0,
        ragUsed: 0,
        handoffs: 0,
        errors: 0,
        avgResponseTimeMs: 0,
        p95ResponseTimeMs: 0,
        totalDurationMs: 0,
        durationSamples: 0,
      });
    }
    const b = buckets.get(date)!;
    switch (evt.type) {
      case "message_received": b.messagesReceived++; break;
      case "message_sent":
        b.aiReplies++;
        if (typeof evt.metadata.durationMs === "number") {
          b.totalDurationMs += evt.metadata.durationMs;
          b.durationSamples++;
        }
        break;
      case "lead_captured": b.newLeads++; break;
      case "appointment_booked": b.appointmentsBooked++; break;
      case "rag_used": b.ragUsed++; break;
      case "handoff_triggered": b.handoffs++; break;
      case "error": b.errors++; break;
    }
  }

  const daily: DailyMetrics[] = Array.from(buckets.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({
      ...b,
      avgResponseTimeMs: b.durationSamples > 0 ? Math.round(b.totalDurationMs / b.durationSamples) : 0,
      p95ResponseTimeMs: 0,
    }));

  const totals = daily.reduce(
    (acc, d) => ({
      date: "",
      messagesReceived: acc.messagesReceived + d.messagesReceived,
      aiReplies: acc.aiReplies + d.aiReplies,
      humanReplies: acc.humanReplies + d.humanReplies,
      newLeads: acc.newLeads + d.newLeads,
      appointmentsBooked: acc.appointmentsBooked + d.appointmentsBooked,
      ragUsed: acc.ragUsed + d.ragUsed,
      handoffs: acc.handoffs + d.handoffs,
      errors: acc.errors + d.errors,
      totalDurationMs: acc.totalDurationMs + d.totalDurationMs,
      durationSamples: acc.durationSamples + d.durationSamples,
    }),
    { date: "", messagesReceived: 0, aiReplies: 0, humanReplies: 0, newLeads: 0, appointmentsBooked: 0, ragUsed: 0, handoffs: 0, errors: 0, totalDurationMs: 0, durationSamples: 0 }
  );

  const citationMap = new Map<string, number>();
  for (const evt of events) {
    if (evt.type === "rag_used" && Array.isArray(evt.metadata.citations)) {
      for (const c of evt.metadata.citations as string[]) {
        citationMap.set(c, (citationMap.get(c) ?? 0) + 1);
      }
    }
  }
  const topCitations = Array.from(citationMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([url, count]) => ({ url, count }));

  const containmentRate = totals.aiReplies > 0
    ? Math.round(((totals.aiReplies - totals.handoffs) / totals.aiReplies) * 100)
    : 0;
  const conversionRate = totals.messagesReceived > 0
    ? Math.round((totals.newLeads / totals.messagesReceived) * 100)
    : 0;

  return {
    tenantId,
    period: {
      from: cutoff.toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
      days,
    },
    daily,
    totals,
    topCitations,
    containmentRate,
    conversionRate,
  };
}

export async function clearAnalytics(tenantId: string): Promise<void> {
  if (!isDbAvailable()) {
    _memEvents.delete(tenantId);
    return;
  }
  const db = getDb();
  await db.delete(schema.analyticsEvents).where(eq(schema.analyticsEvents.tenantId, tenantId));
}
```

- [ ] **Step 2: Update the two call sites in `server/routes/admin.ts`**

Find line ~772 (`const analytics = getAnalytics(tenantId, days);`) and add `await`:
```typescript
const analytics = await getAnalytics(tenantId, days);
```

Find line ~779 (`clearAnalytics(tenantId);`) and add `await`:
```typescript
await clearAnalytics(tenantId);
```

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: all 24 tests pass.

- [ ] **Step 4: Commit**

```bash
git add server/services/analytics.ts server/routes/admin.ts
git commit -m "feat: replace file-based analytics with PostgreSQL + in-memory fallback"
```

---

## Task 6: Replace `webhookLogger.ts` with PostgreSQL backend

**Files:**
- Modify: `server/services/webhookLogger.ts`
- Modify: `server/routes/admin.ts` (add `await` at lines ~789 and ~796)

**Interfaces:**
- Produces: same exports; `getWebhookEvents` is now `async`; `logWebhookEvent` is still void (fire-and-forget)

- [ ] **Step 1: Replace the full content of `server/services/webhookLogger.ts`**

```typescript
import { eq, desc, sql } from "drizzle-orm";
import { getDb, isDbAvailable, schema } from "../db/index";

// ── Types (unchanged) ─────────────────────────────────────────────────────────

export type WebhookChannel = "whatsapp" | "messenger" | "telegram" | "sms" | "simulator";
export type WebhookDirection = "inbound" | "outbound";
export type WebhookStatus = "success" | "error";

export interface WebhookEvent {
  id: string;
  tenantId: string;
  timestamp: string;
  channel: WebhookChannel;
  direction: WebhookDirection;
  status: WebhookStatus;
  durationMs: number;
  payload: unknown;
  errorMessage?: string;
  senderPhone?: string;
  messagePreview?: string;
}

// ── In-memory fallback ────────────────────────────────────────────────────────

const _memEvents: Map<string, WebhookEvent[]> = new Map();
const MAX_EVENTS_PER_TENANT = 200;
const MAX_PAYLOAD_BYTES = 2048;

function truncatePayload(payload: unknown): unknown {
  try {
    const str = JSON.stringify(payload);
    if (str.length <= MAX_PAYLOAD_BYTES) return payload;
    return { _truncated: true, preview: str.slice(0, MAX_PAYLOAD_BYTES) };
  } catch {
    return { _error: "Could not serialize payload" };
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Fire-and-forget. Never throws. */
export function logWebhookEvent(
  tenantId: string,
  event: Omit<WebhookEvent, "id" | "timestamp" | "tenantId">
): void {
  const record: WebhookEvent = {
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tenantId,
    timestamp: new Date().toISOString(),
    ...event,
    payload: truncatePayload(event.payload),
  };

  if (!isDbAvailable()) {
    const list = _memEvents.get(tenantId) ?? [];
    list.push(record);
    _memEvents.set(tenantId, list.slice(-MAX_EVENTS_PER_TENANT));
    return;
  }

  const db = getDb();
  db.insert(schema.webhookEvents)
    .values({
      id: record.id,
      tenantId,
      timestamp: new Date(record.timestamp),
      channel: record.channel,
      direction: record.direction,
      status: record.status,
      durationMs: record.durationMs,
      payload: record.payload as object,
      errorMessage: record.errorMessage ?? null,
      senderPhone: record.senderPhone ?? null,
      messagePreview: record.messagePreview ?? null,
    })
    .then(() => {
      // Rolling ring buffer: delete oldest events beyond MAX_EVENTS_PER_TENANT
      return db.execute(
        sql`DELETE FROM webhook_events WHERE tenant_id = ${tenantId} AND id NOT IN (
          SELECT id FROM webhook_events WHERE tenant_id = ${tenantId}
          ORDER BY timestamp DESC LIMIT ${MAX_EVENTS_PER_TENANT}
        )`
      );
    })
    .catch((err) => console.error("[webhookLogger] logWebhookEvent error:", err));
}

export async function getWebhookEvents(tenantId: string, limit = 50): Promise<WebhookEvent[]> {
  if (!isDbAvailable()) {
    const list = _memEvents.get(tenantId) ?? [];
    return list.slice(-limit).reverse();
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.webhookEvents)
    .where(eq(schema.webhookEvents.tenantId, tenantId))
    .orderBy(desc(schema.webhookEvents.timestamp))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    timestamp: (r.timestamp as Date).toISOString(),
    channel: r.channel as WebhookChannel,
    direction: r.direction as WebhookDirection,
    status: r.status as WebhookStatus,
    durationMs: r.durationMs,
    payload: r.payload,
    errorMessage: r.errorMessage ?? undefined,
    senderPhone: r.senderPhone ?? undefined,
    messagePreview: r.messagePreview ?? undefined,
  }));
}

export async function clearWebhookEvents(tenantId: string): Promise<void> {
  if (!isDbAvailable()) {
    _memEvents.delete(tenantId);
    return;
  }
  const db = getDb();
  await db.delete(schema.webhookEvents).where(eq(schema.webhookEvents.tenantId, tenantId));
}
```

- [ ] **Step 2: Update call sites in `server/routes/admin.ts`**

Find line ~789 (`const events = getWebhookEvents(tenantId, limit);`) and add `await`:
```typescript
const events = await getWebhookEvents(tenantId, limit);
```

Find line ~796 (`clearWebhookEvents(tenantId);`) and add `await`:
```typescript
await clearWebhookEvents(tenantId);
```

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: all 24 tests pass.

- [ ] **Step 4: Commit**

```bash
git add server/services/webhookLogger.ts server/routes/admin.ts
git commit -m "feat: replace file-based webhookLogger with PostgreSQL + in-memory fallback"
```

---

## Task 7: Update `rag.ts` to use pgvector + update all call sites

`getRAGContext` signature changes from `(query, knowledgeBase, filter?)` to `(query, tenantId, filter?)`. When `DATABASE_URL` is not set, it falls back to returning empty context (no chunks in memory without embeddings). `enrichTenantEmbeddings` now stores chunks to the `kb_chunks` table instead of mutating the in-memory tenant object.

**Files:**
- Modify: `server/services/rag.ts`
- Modify: `server/routes/webhooks.ts` (4 call sites)
- Modify: `server/routes/integrations.ts` (1 call site)
- Modify: `server/routes/admin.ts` (1 call site, line ~622)

**Interfaces:**
- Consumes: `server/db/index.ts`
- Produces: `getRAGContext(query: string, tenantId: string, filter?: RAGFilter): Promise<{contextText: string; citations: string[]}>` — uses pgvector `<=>` cosine distance

- [ ] **Step 1: Replace the full content of `server/services/rag.ts`**

```typescript
import { eq, and, sql } from "drizzle-orm";
import { ai } from "./gemini";
import { Type } from "@google/genai";
import { getDb, isDbAvailable, schema } from "../db/index";

// ── Pure utility functions (unchanged) ────────────────────────────────────────

export function chunkText(text: string, size = 800, overlap = 100): string[] {
  if (!text) return [];
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 1 <= size) {
      currentChunk += (currentChunk ? " " : "") + trimmed;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (trimmed.length > size) {
        let idx = 0;
        while (idx < trimmed.length) {
          chunks.push(trimmed.substring(idx, idx + size));
          idx += size - overlap;
        }
        currentChunk = "";
      } else {
        const overlapPart = currentChunk.substring(Math.max(0, currentChunk.length - overlap));
        currentChunk = overlapPart.trim() + (overlapPart ? " " : "") + trimmed;
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

export async function getEmbedding(text: string): Promise<number[] | undefined> {
  if (!ai) return undefined;
  try {
    const response = await ai.models.embedContent({ model: "text-embedding-004", contents: text });
    return (response as any).embedding?.values || undefined;
  } catch (err) {
    console.error("Gemini Embeddings error:", err);
    return undefined;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── enrichTenantEmbeddings: stores chunks to DB (replaces in-memory mutation) ─

export async function enrichTenantEmbeddings(tenant: any): Promise<any> {
  if (!tenant || !tenant.knowledgeBase || !Array.isArray(tenant.knowledgeBase)) return tenant;
  if (!ai) return tenant;

  if (!isDbAvailable()) {
    // No DB: return tenant unchanged (can't store chunks)
    return tenant;
  }

  const db = getDb();

  for (const item of tenant.knowledgeBase) {
    // Check if chunks already exist for this document
    const existing = await db
      .select({ id: schema.kbChunks.id })
      .from(schema.kbChunks)
      .where(eq(schema.kbChunks.documentId, item.id))
      .limit(1);

    if (existing.length > 0) continue;

    console.log(`[RAG ENGINE] Embedding document "${item.title}"...`);
    const textChunks = chunkText(item.content);

    for (const txt of textChunks) {
      const embedding = await getEmbedding(txt);
      await db.insert(schema.kbChunks).values({
        documentId: item.id,
        tenantId: tenant.id,
        chunkText: txt,
        embedding: embedding ?? null,
      });
    }
  }

  // Return tenant without the chunks array — chunks now live in DB
  return tenant;
}

// ── RAG Filter type (unchanged) ────────────────────────────────────────────────

export interface RAGFilter {
  type?: "faq" | "document" | "file" | "url" | "crawl";
  titlePattern?: string;
}

// ── getRAGContext: now uses pgvector ANN search ───────────────────────────────

export async function getRAGContext(
  query: string,
  tenantId: string,
  filter?: RAGFilter
): Promise<{ contextText: string; citations: string[] }> {

  if (!isDbAvailable()) {
    return { contextText: "No knowledge base available (database not configured).", citations: [] };
  }

  const db = getDb();
  const queryVector = ai ? await getEmbedding(query) : undefined;

  let candidates: { chunkText: string; title: string; type: string }[];

  if (queryVector) {
    // pgvector cosine distance search
    const vectorLiteral = `[${queryVector.join(",")}]`;

    const rows = await db.execute(sql`
      SELECT
        kc.chunk_text,
        kd.title,
        kd.type,
        1 - (kc.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}::vector) AS similarity
      FROM kb_chunks kc
      JOIN kb_documents kd ON kc.document_id = kd.id AND kd.tenant_id = kc.tenant_id
      WHERE kc.tenant_id = ${tenantId}
        ${filter?.type ? sql`AND kd.type = ${filter.type}` : sql``}
        ${filter?.titlePattern ? sql`AND LOWER(kd.title) LIKE ${'%' + filter.titlePattern.toLowerCase() + '%'}` : sql``}
        AND kc.embedding IS NOT NULL
      ORDER BY kc.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}::vector
      LIMIT 8
    `);

    candidates = (rows.rows ?? rows) as any[];
  } else {
    // Fallback: keyword search when embeddings are unavailable
    const rows = await db
      .select({
        chunkText: schema.kbChunks.chunkText,
        title: schema.kbDocuments.title,
        type: schema.kbDocuments.type,
      })
      .from(schema.kbChunks)
      .innerJoin(
        schema.kbDocuments,
        and(
          eq(schema.kbChunks.documentId, schema.kbDocuments.id),
          eq(schema.kbDocuments.tenantId, schema.kbChunks.tenantId)
        )
      )
      .where(eq(schema.kbChunks.tenantId, tenantId))
      .limit(8);

    candidates = rows;
  }

  if (candidates.length === 0) {
    return { contextText: "No matching knowledge base documents found.", citations: [] };
  }

  // Gemini re-ranking (unchanged logic)
  let finalChunks = candidates.slice(0, 4);
  if (ai && candidates.length > 1) {
    try {
      const prompt = `You are a RAG Re-ranking system.
Given the user query: "${query}"
And the following document chunks, select the top 3-4 chunks that are most relevant to answering the query.
Return your choice strictly as a JSON array of integers representing the 0-indexed indices of the chosen chunks in order of relevance (most relevant first).
Do not wrap your output in markdown codeblocks. Return bare clean JSON.

Chunks:
${candidates.map((c, i) => `[Chunk ${i}]:\nTitle: ${c.title}\nContent: ${c.chunkText}`).join("\n\n")}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: { type: Type.ARRAY, items: { type: Type.INTEGER } },
        },
      });

      const rawText = response.text || "";
      let indices: number[];
      try {
        indices = JSON.parse(rawText.trim());
      } catch {
        const match = rawText.match(/\[.*\]/s);
        indices = match ? JSON.parse(match[0]) : [];
      }

      if (Array.isArray(indices) && indices.length > 0) {
        const reRanked: typeof candidates = [];
        const seen = new Set<number>();
        indices.forEach((idx) => {
          if (idx >= 0 && idx < candidates.length && !seen.has(idx)) {
            reRanked.push(candidates[idx]);
            seen.add(idx);
          }
        });
        candidates.forEach((c, idx) => {
          if (!seen.has(idx) && reRanked.length < 4) reRanked.push(c);
        });
        finalChunks = reRanked.slice(0, 4);
        console.log(`[RAG ENGINE] Re-ranked candidates:`, finalChunks.map((c) => c.title));
      }
    } catch (reRankErr) {
      console.warn("[RAG ENGINE] Re-ranking failed, using vector order:", reRankErr);
    }
  }

  const uniqueCitations = Array.from(new Set(finalChunks.map((c) => c.title)));
  const contextText = finalChunks
    .map((c) => `[DOCUMENT: ${c.title}]\n${c.chunkText}`)
    .join("\n\n");

  return { contextText, citations: uniqueCitations };
}
```

- [ ] **Step 2: Update `server/routes/webhooks.ts` — 4 call sites**

For each of the 4 occurrences of `getRAGContext(textBody, knowledgeBase)` in `webhooks.ts`, the surrounding code loads `tenant` from the store and has `tenantId` available. Replace:

```typescript
// BEFORE (each of 4 occurrences):
const ragResult = await getRAGContext(textBody, knowledgeBase);

// AFTER (each of 4 occurrences):
const ragResult = await getRAGContext(textBody, tenantId);
```

Also remove the `knowledgeBase` variable assignments near each call site (where `const knowledgeBase = tenant.knowledgeBase` was set just for this call) — they're no longer needed.

- [ ] **Step 3: Update `server/routes/integrations.ts` — 1 call site**

The `/api/chat` route receives `tenantId` in `req.body`. Replace:

```typescript
// BEFORE (line ~85):
const ragResult = await getRAGContext(lastMessage, knowledgeBase);

// AFTER:
const ragResult = await getRAGContext(lastMessage, tenantId);
```

Remove the `knowledgeBase` destructuring from `req.body` if it's only used here. Keep other fields.

- [ ] **Step 4: Update `server/routes/admin.ts` — 1 call site (playground route ~line 621)**

```typescript
// BEFORE:
const { getRAGContext } = await import("../services/rag");
const ragResult = await getRAGContext(lastMessage, knowledgeBase);

// AFTER:
const { getRAGContext } = await import("../services/rag");
const ragResult = await getRAGContext(lastMessage, tenantId);
```

- [ ] **Step 5: Run tests**

```bash
npm run test
```

Expected: all 24 tests pass. (The RAG tests use mocked embeddings and the in-memory fallback returns empty context, which is acceptable for unit tests.)

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add server/services/rag.ts server/routes/webhooks.ts server/routes/integrations.ts server/routes/admin.ts
git commit -m "feat: pgvector RAG search, enrichTenantEmbeddings stores to DB, update all getRAGContext call sites"
```

---

## Task 8: Call `runMigrations()` at server startup + write JSON → PostgreSQL import script

**Files:**
- Modify: `server.ts` (add `runMigrations()` call near top)
- Create: `scripts/migrate-json-to-pg.ts`

**Interfaces:**
- Consumes: `server/db/migrate.ts`, existing JSON files (`tenants_store.json`, `webhook_conversations.json`)
- Produces: server auto-migrates on startup; one-shot script to seed PostgreSQL from existing JSON data

- [ ] **Step 1: Call `runMigrations()` at server startup**

Open `server.ts`. At the top of the file (after imports, before the Express app setup), add:

```typescript
import { runMigrations } from "./server/db/migrate";

// Near the top of the startup sequence, before any route registration:
await runMigrations();
```

If the file already uses a top-level async `main()` function or an IIFE, add the call inside it. If it's top-level (using `server.listen()`), wrap it in an async IIFE or convert the startup to async:

```typescript
(async () => {
  await runMigrations();
  // ... rest of startup
  server.listen(PORT, () => console.log(`[SERVER] Listening on port ${PORT}`));
})();
```

- [ ] **Step 2: Create `scripts/migrate-json-to-pg.ts`**

This script is run **once** to import existing JSON data into PostgreSQL. It's safe to re-run (uses upserts).

```typescript
#!/usr/bin/env tsx
/**
 * One-time migration: reads tenants_store.json and webhook_conversations.json
 * and imports all data into PostgreSQL.
 *
 * Usage:
 *   DATABASE_URL=postgres://aura:aura@localhost:5432/aura npx tsx scripts/migrate-json-to-pg.ts
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Must set DATABASE_URL before importing db modules
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required.");
  process.exit(1);
}

import { writeTenantsStore, writeConversationsStore } from "../server/services/db";
import { decryptTenant } from "../server/services/encryption";
import { runMigrations } from "../server/db/migrate";

async function main() {
  console.log("[MIGRATION] Running database migrations...");
  await runMigrations();

  // ── Tenants ────────────────────────────────────────────────────────────────
  const tenantsFile = path.join(process.cwd(), "tenants_store.json");
  if (fs.existsSync(tenantsFile)) {
    console.log("[MIGRATION] Importing tenants from tenants_store.json...");
    const raw = JSON.parse(fs.readFileSync(tenantsFile, "utf-8"));
    const store: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      try {
        store[k] = decryptTenant(v as any);
      } catch {
        store[k] = v; // already decrypted or plain
      }
    }
    await writeTenantsStore(store);
    console.log(`[MIGRATION] ✓ Imported ${Object.keys(store).length} tenants.`);
  } else {
    console.log("[MIGRATION] tenants_store.json not found, skipping.");
  }

  // ── Conversations ──────────────────────────────────────────────────────────
  const convFile = path.join(process.cwd(), "webhook_conversations.json");
  if (fs.existsSync(convFile)) {
    console.log("[MIGRATION] Importing conversations from webhook_conversations.json...");
    const store = JSON.parse(fs.readFileSync(convFile, "utf-8"));
    await writeConversationsStore(store);
    console.log(`[MIGRATION] ✓ Imported ${Object.keys(store).length} conversations.`);
  } else {
    console.log("[MIGRATION] webhook_conversations.json not found, skipping.");
  }

  console.log("[MIGRATION] ✅ Migration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[MIGRATION] ❌ Failed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Add migration script to `package.json`**

In `package.json` `"scripts"` section, add:

```json
"db:migrate": "drizzle-kit migrate",
"db:generate": "drizzle-kit generate",
"db:studio": "drizzle-kit studio",
"db:import-json": "tsx scripts/migrate-json-to-pg.ts"
```

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: all 24 tests pass.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add server.ts scripts/migrate-json-to-pg.ts package.json
git commit -m "feat: auto-migrate DB on startup and add JSON→PostgreSQL import script"
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Task covering it |
|-------------|-----------------|
| PostgreSQL 17 + pgvector in Docker Compose | Task 1 |
| Drizzle ORM schema with all tables | Task 2 |
| `vector(768)` column on `kb_chunks` | Task 2 |
| HNSW-compatible `<=>` cosine query in RAG | Task 7 |
| `DATABASE_URL` env var | Task 1 |
| Drizzle migrations | Task 3 |
| Replace `db.ts` (tenants, conversations) | Task 4 |
| Replace `analytics.ts` | Task 5 |
| Replace `webhookLogger.ts` | Task 6 |
| Update routes for async analytics/webhook | Tasks 5, 6 |
| Update `getRAGContext` call sites (6 total) | Task 7 |
| `enrichTenantEmbeddings` stores to DB | Task 7 |
| Data migration script (JSON → PostgreSQL) | Task 8 |
| Auto-migrate on server startup | Task 8 |
| In-memory fallback for tests without DB | Tasks 4, 5, 6, 7 |
| All 24 tests pass | Verified in each task |
| Build passes | Verified in Tasks 7, 8 |

### Placeholder Scan

No "TBD", "TODO", "fill in", or "similar to Task N" patterns in this plan.

### Type Consistency

- `getDb()` is the only entry point to the drizzle client — used consistently across Tasks 4–8.
- `isDbAvailable()` gates every DB call — used identically in all five service files.
- `_setMemTenant` / `_clearMemStore` are the test injection helpers — only exported from `db.ts`, only called from `tests/backend.test.ts`.
- `getRAGContext(query, tenantId, filter?)` — new signature applied to all 6 call sites in Task 7.
- `getAnalytics` → `Promise<AggregatedAnalytics>` — `await` added to both call sites in Task 5.
- `getWebhookEvents` → `Promise<WebhookEvent[]>` — `await` added to both call sites in Task 6.
