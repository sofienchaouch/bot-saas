# CLAUDE.md — Aura Platform

This file provides essential context for AI assistants (Claude, Gemini, etc.) working on this codebase.
Read this before making any changes.

---

## Project Overview

**Aura** is a multi-tenant WhatsApp AI Agent SaaS platform. Each tenant gets an autonomous AI bot
(powered by Google Gemini) that handles WhatsApp, Facebook Messenger, Telegram, and SMS conversations,
captures leads, books appointments, and answers questions using a per-tenant knowledge base (RAG).

The app is a **full-stack TypeScript monorepo**: an Express backend and a React SPA served from the
same process. In development, Vite proxies the frontend. In production, Express serves the built `dist/`.

---

## Key Commands

```bash
# Development (frontend + backend together, hot-reloaded)
npm run dev

# Run all tests (vitest)
npm run test

# Type-check only (no emit)
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format with Prettier
npm run format

# Production build (Vite + esbuild)
npm run build

# Start the production build
npm run start
```

> **Never run `npm install` without `--legacy-peer-deps`** — there is a peer dep conflict between
> `@firebase/eslint-plugin-security-rules` and `@typescript-eslint` versions.

---

## Architecture

### Entrypoint

```
server.ts          ← Express app bootstrap, Vite dev middleware, WebSocket setup,
                     background crawl scheduler (runs every 15s)
```

### Backend (`server/`)

```
server/
├── config.ts              ← Zod env validation; exports PORT, ENCRYPTION_KEY, NODE_ENV, etc.
│                            Blocks startup in production if default secrets are used.
├── routes/
│   ├── index.ts           ← Mounts admin + webhooks + integrations routers
│   ├── admin.ts           ← All authenticated tenant management routes:
│   │                         /api/tenants, /api/tenant/:id/kb, /api/tenant/:id/crawl,
│   │                         /api/tenant/:id/analytics, /api/tenant/:id/webhook-events,
│   │                         /api/tenant/:id/playground (Gemini sandbox)
│   ├── webhooks.ts        ← Public webhook receivers:
│   │                         WhatsApp Cloud API (GET verify + POST inbound),
│   │                         Facebook Messenger, Telegram, Twilio SMS, Twilio Voice TwiML
│   └── integrations.ts    ← /api/chat (Bot Simulator), /api/tenant/:id/appointment (public booking),
│                             /api/health, /api/twilio/voice
├── services/
│   ├── analytics.ts       ← Persists analytics events per tenant (analytics_store/<id>.json)
│   │                         recordEvent() / getAnalytics() / clearAnalytics()
│   ├── db.ts              ← readTenantsStore / writeTenantsStore / readConversationsStore
│   │                         Switches between Firestore (if configured) and local JSON files
│   ├── encryption.ts      ← AES-256-CBC encrypt/decrypt using ENCRYPTION_KEY env var
│   ├── gemini.ts          ← Singleton Google GenAI client (null if GEMINI_API_KEY not set)
│   ├── promptBuilder.ts   ← buildSystemPrompt() — single canonical system prompt builder
│   │                         (was duplicated 4x in the old monolith)
│   ├── rag.ts             ← Hybrid RAG engine:
│   │                         getEmbedding() → text-embedding-004
│   │                         chunkText() → semantic chunking
│   │                         computeKeywordScores() → TF-IDF scoring
│   │                         getRAGContext() → hybrid vector + keyword + Gemini re-ranking
│   ├── webhookLogger.ts   ← Ring buffer of 200 webhook events per tenant (webhook_events/<id>.json)
│   │                         logWebhookEvent() / getWebhookEvents() / clearWebhookEvents()
│   ├── websocket.ts       ← Twilio Voice WebSocket bridge (real-time audio transcription)
│   └── whatsapp.ts        ← sendWhatsAppMessage() via Meta Graph API; isPlaceholderToken()
├── middleware/
│   ├── auth.ts            ← authMiddleware: validates Firebase Auth Bearer token
│   │                         Bypasses in NODE_ENV=test; allows X-Test-Auth-Bypass header
│   ├── errorHandler.ts    ← asyncHandler() wrapper + global errorHandler middleware
│   └── rateLimit.ts       ← apiLimiter (100 req/15min) + webhookLimiter (200 req/1min)
```

### Frontend (`src/`)

```
src/
├── main.tsx               ← React root mount
├── App.tsx                ← Top-level routing (React Router v7), Firebase auth, tenant sync
├── types.ts               ← Shared TypeScript interfaces:
│                             Tenant, Lead, Appointment, KnowledgeBaseItem, ChatMessage,
│                             Agent, SimulationSession, KBChunk, WelcomeTemplate
├── defaultData.ts         ← Default tenant seed data (used when no Firestore data exists)
├── LanguageContext.tsx     ← i18n context; supports English, French, Arabic, Tunisian Derja
├── firebase.ts            ← Firebase app init + auth exports
├── googleCalendar.ts      ← Google Calendar API helpers
├── googleWorkspace.ts     ← Google Workspace (Drive, Meet) helpers
├── context/
│   └── SaaSContext.tsx    ← Zustand-backed React context; owns ALL tenant state:
│                             selectedTenant, waStatus, conversations, etc.
├── index.css              ← Global Tailwind CSS + custom font definitions
└── components/
    ├── SaaSLayout.tsx     ← Main admin shell: sidebar nav, tab router, WebSocket dialer modal
    ├── BotSimulator.tsx   ← WhatsApp-style phone simulator UI
    ├── SaaSCharts.tsx     ← Analytics dashboard (Recharts + custom widget imports)
    ├── SaaSLandingPage.tsx← Marketing landing page
    ├── SaaSAuth.tsx       ← Sign-in / Sign-up screens
    ├── SaaSOwnerDashboard.tsx ← Platform owner (superadmin) console
    ├── SaasHeader.tsx     ← Top navigation bar
    ├── WorkspaceHub.tsx   ← Google Workspace integration panel
    ├── WhatsAppStatusIndicator.tsx ← Sidebar WA connection widget
    ├── CalendarBookingPage.tsx ← Public-facing appointment booking page
    ├── tabs/              ← One file per admin dashboard tab:
    │   ├── InsightsTab.tsx        ← Analytics overview; live data toggle → /api/tenant/:id/analytics
    │   ├── BotConfigTab.tsx       ← Bot personality, tone, agents, voice settings
    │   ├── KnowledgeBaseTab.tsx   ← KB CRUD, file upload, URL crawl trigger
    │   ├── LeadsTab.tsx           ← CRM pipeline, conversation threads, citations
    │   ├── CalendarTab.tsx        ← Appointment management + Google Calendar sync
    │   ├── WhatsAppIntegrationTab.tsx ← Channel config (WA, Messenger, sandbox OTP)
    │   ├── WebhookLogsTab.tsx     ← Live webhook event log with payload inspector
    │   └── BillingTab.tsx         ← Subscription tiers and quota display
    └── widgets/           ← Modular dashboard widget components
        ├── RealTimeOpsWidgets.tsx
        ├── CustomerIntelligenceWidgets.tsx
        ├── BusinessWidgets.tsx
        ├── BotPerformanceWidgets.tsx
        ├── TeamWidgets.tsx
        └── CommandPalette.tsx
```

---

## Data Storage

| Store | File | Purpose |
|-------|------|---------|
| Tenants | `tenants_store.json` | All tenant configs, KB, leads, appointments |
| Conversations | `webhook_conversations.json` | WhatsApp/Messenger message history |
| Analytics | `analytics_store/<tenantId>.json` | Event log per tenant (max 10k events) |
| Webhook events | `webhook_events/<tenantId>.json` | Ring buffer of 200 events per tenant |

In test mode (`NODE_ENV=test`), separate `*.test.json` files and `*_test/` directories are used
to avoid polluting production data. **All of these are gitignored.**

When `FIREBASE_PROJECT_ID` is set, the `db.ts` service uses **Firestore** instead of local JSON.
The Firestore document structure mirrors the `Tenant` interface in `src/types.ts`.

---

## Environment Variables

Defined and validated in [`server/config.ts`](server/config.ts) via **Zod**. The server **exits
at startup** if required variables are missing or if production defaults are detected.

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `GEMINI_API_KEY` | Optional | — | AI features disabled gracefully if missing |
| `ENCRYPTION_KEY` | Required | fallback string | Must be overridden in production |
| `WHATSAPP_VERIFY_TOKEN` | Optional | fallback string | Used to verify Meta webhook handshake |
| `WHATSAPP_APP_SECRET` | Optional | fallback string | Used for HMAC-SHA256 webhook signature check |
| `PORT` | Optional | `3000` | Express listen port |
| `NODE_ENV` | Optional | `development` | Set to `production` or `test` |
| `APP_URL` | Optional | — | CORS origin allowlist |

Copy `.env.example` → `.env` to get started.

---

## Authentication & Security

- **API routes** (`/api/*`) are protected by `authMiddleware` in `server/middleware/auth.ts`
  - Validates a Firebase Auth **Bearer token** from the `Authorization` header
  - In `NODE_ENV=test`, any request with `X-Test-Auth-Bypass: true` is allowed through
  - Public exceptions: `/api/health`, `/api/webhook*`, `/api/tenant/:id/appointment`, `/api/chat`, `/api/twilio/*`
- **Webhook signature** on inbound WhatsApp POST: HMAC-SHA256 `X-Hub-Signature-256` verified against `WHATSAPP_APP_SECRET`
- **SSRF protection** on the crawler: only `https://` URLs, private IP ranges blocked via DNS lookup
- **Encryption**: AES-256-CBC via `server/services/encryption.ts`. Fails hard (throws) — never silently returns plaintext
- **Rate limiting**: 100 req/15min on `/api/`, 200 req/1min on `/api/webhook`
- **Security headers**: `helmet()` applied globally

---

## Testing

Tests live in [`tests/`](tests/):

```bash
npm run test          # Run all tests
npm run test -- --reporter=verbose   # Verbose output
```

| File | Coverage |
|------|----------|
| `tests/backend.test.ts` | 24 tests: API endpoints, webhook handlers, crawler, RAG, auth, error handler, Telegram, SMS, quota |
| `tests/frontend.test.tsx` | 4 tests: React component rendering, RBAC role switching, signup flow |

**Test isolation**: `NODE_ENV=test` is set automatically by vitest. The auth middleware accepts
`X-Test-Auth-Bypass: true`. Storage reads/writes use `*.test.json` files that are cleaned up
between test runs.

---

## Multi-Language Support

The bot auto-detects and responds in: **English, French, Arabic, Tunisian Derja (dialect)**.
Detection and language instructions are embedded in `buildSystemPrompt()` in `server/services/promptBuilder.ts`.

The admin UI supports 4 languages via `src/LanguageContext.tsx`. All UI strings go through `t('key')`.

---

## Adding a New Feature — Checklist

1. **Types**: Add interfaces/fields to `src/types.ts`
2. **Backend service**: Create `server/services/<name>.ts`
3. **Routes**: Add to `server/routes/admin.ts` (authenticated) or `server/routes/integrations.ts` (public)
4. **Frontend**: Create `src/components/tabs/<Name>Tab.tsx` and register in `SaaSLayout.tsx`
5. **Tests**: Add cases to `tests/backend.test.ts` (use supertest + `X-Test-Auth-Bypass: true`)
6. **Verify**: `npm run test && npm run build` — both must pass

---

## Known Constraints

- **`npm install` requires `--legacy-peer-deps`** due to Firebase ESLint plugin peer dep conflict
- The `SaaSLayout.tsx` component is still large (~900 lines) — tabs are modularized but the shell is not yet split
- `BotSimulator.tsx` (~100KB) is a candidate for further splitting
- Scheduled crawler (in `server.ts`) uses mock content generation — real scheduled crawling is not yet implemented
- WebSocket voice bridge (`server/services/websocket.ts`) requires a valid Twilio account + Gemini API key to function
- Firestore rules (`firestore.rules`) do not yet enforce per-tenant ownership — any signed-in user can read all tenants
