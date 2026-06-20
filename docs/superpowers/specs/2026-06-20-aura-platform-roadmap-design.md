# Aura Platform — Complete Product Roadmap & Design Spec

**Date:** 2026-06-20  
**Author:** Sofien Chaouch  
**Status:** Approved for implementation

## Context

This spec consolidates the full roadmap for the Aura WhatsApp AI Agent SaaS platform across five dimensions:

1. **Technical stack hardening** — infrastructure gaps that block production reliability
2. **Production/client-readiness** — what's missing before a paying client can self-serve
3. **UI/UX redesign** — progressive disclosure navigation + polish pass
4. **Superadmin dashboard upgrade** — replace mocked data with real business operations tooling
5. **Growth & retention features** — distribution, team collaboration, integrations, AI quality

Total estimated effort: **~56 days** across all tracks.  
Recommended to tackle one track at a time in the order specified in the Build Order section.

---

## Track 1 — Technical Stack Hardening

### 1.1 Observability
**Priority:** Critical | **Effort:** 1 day

Replace `console.log` with structured logging and add error tracking.

- Install `pino` + `pino-pretty` (dev) as the single logger
- Add request correlation IDs via `AsyncLocalStorage` context — every log line for a request shares the same `requestId`
- Integrate Sentry (`@sentry/node`) wired into `server/middleware/errorHandler.ts`
- Implement `/api/health` endpoint that checks: DB connectivity, Gemini API reachability, Redis ping
- Log levels: `debug` (dev only), `info` (requests), `warn` (recoverable errors), `error` (unhandled exceptions)

**Files:** `server/middleware/errorHandler.ts`, `server/config.ts`, `server/routes/integrations.ts`

---

### 1.2 Tenant Access Middleware
**Priority:** Critical | **Effort:** 0.5 day

Every `/api/tenant/:id/*` route must verify the authenticated user owns that tenant. Currently routes extract `tenantId` from URL params with no ownership check — a bug could expose one tenant's data to another.

- Create `server/middleware/tenantAccess.ts` — extract `tenantId` from params, verify against Firebase UID in the tenants table
- Mount on all admin routes in `server/routes/admin.ts`
- Add PostgreSQL Row-Level Security (RLS) policies on `kb_chunks`, `conversations`, `leads`, `appointments`
- Add a cross-tenant data leakage test in `tests/backend.test.ts`

**Files:** `server/middleware/tenantAccess.ts` (new), `server/routes/admin.ts`, `firestore.rules`

---

### 1.3 BullMQ Job Queue
**Priority:** High | **Effort:** 2 days

Replace the `setInterval` crawler in `server.ts` with a Redis-backed job queue. The current approach loses all pending jobs on server restart, has no retry logic, and can pile up under load.

- Add Redis service to `docker-compose.yml`
- Install `bullmq` + `ioredis`
- Create `server/services/queue.ts` — defines queues: `crawl`, `outbound-message`, `webhook-retry`
- Create `server/workers/crawlWorker.ts` — processes crawl jobs with 3 retries, exponential backoff
- Create `server/workers/messageWorker.ts` — processes outbound WhatsApp/Telegram/SMS sends
- Move scheduler logic out of `server.ts` into `server/services/scheduler.ts`
- Add Bull Board UI at `/admin/queues` (dev only, gated by `NODE_ENV`)

**Files:** `server.ts`, `server/services/queue.ts` (new), `server/workers/` (new dir), `docker-compose.yml`

---

### 1.4 Analytics + Webhook Events → PostgreSQL
**Priority:** High | **Effort:** 1 day

Analytics and webhook events are currently written to local JSON files (`analytics_store/<id>.json`, `webhook_events/<id>.json`), bypassing the PostgreSQL schema entirely. Both tables already exist in the Drizzle schema.

- Update `server/services/analytics.ts` to write to `analytics_events` table
- Update `server/services/webhookLogger.ts` to write to `webhook_events` table
- Remove local JSON file writes
- Verify `/analytics` and `/webhook-events` admin routes still return correct shape

**Files:** `server/services/analytics.ts`, `server/services/webhookLogger.ts`

---

### 1.5 CI/CD Pipeline Completion
**Priority:** Medium | **Effort:** 1 day

CI currently lints, tests, and builds — but never runs migrations or deploys.

- Add `drizzle-kit migrate` step in `.github/workflows/ci.yml` before tests run
- Add `docker build + push` to GHCR on merge to `main`
- Add deploy step (Fly.io / Railway / DigitalOcean — to be decided based on hosting)
- Add `npm audit --audit-level=high` security scan step
- Add `.github/dependabot.yml` for weekly dependency updates

**Files:** `.github/workflows/ci.yml`, `.github/dependabot.yml` (new)

---

### 1.6 Per-Tenant Rate Limiting
**Priority:** Medium | **Effort:** 0.5 day

Global rate limit (100 req/15min) is insufficient — one abusive tenant can starve all others. Requires Redis from Track 1.3.

- Add Redis-backed rate limiter in `server/middleware/rateLimit.ts` keyed on `tenantId`
- Limits: 500 messages/hour per tenant, 100 KB uploads/day per tenant
- Return `429` with `X-RateLimit-Reset` header and a tenant-specific error message

**Files:** `server/middleware/rateLimit.ts`

---

## Track 2 — Production / Client-Readiness

### 2.1 Stripe Billing + Paywall
**Priority:** Critical | **Effort:** 3–4 days

`BillingTab.tsx` currently displays pricing but has no payment backend. Clients cannot pay.

- Install `stripe` SDK
- Create `server/services/stripe.ts` with: `createCheckoutSession()`, `createCustomerPortalSession()`, `handleWebhookEvent()`
- Stripe webhook handler for: `invoice.paid`, `customer.subscription.deleted`, `payment_failed`, `customer.subscription.updated`
- Add fields to tenant Drizzle schema: `stripe_customer_id`, `subscription_status`, `plan_tier`, `trial_ends_at`
- Enforce tier limits server-side in relevant routes (KB item count, message quota, number of agents)
- Wire `BillingTab.tsx` to real Stripe Checkout and Customer Portal session URLs
- 14-day free trial on signup, then paywall gate with upgrade prompt

**Files:** `server/services/stripe.ts` (new), `server/routes/admin.ts`, `src/components/tabs/BillingTab.tsx`, Drizzle schema

---

### 2.2 Transactional Email
**Priority:** Critical | **Effort:** 1 day

No email is sent on signup, billing events, or trial expiry.

- Use Resend (simple API, generous free tier, good deliverability)
- Create `server/services/email.ts` with: `sendWelcome()`, `sendPaymentFailed()`, `sendTrialEnding()`, `sendMonthlyReport()`
- Trigger `sendWelcome()` on tenant creation
- Trigger billing emails from Stripe webhook handler (2.1)
- Trigger monthly report email via BullMQ scheduled job (1.3)

**Files:** `server/services/email.ts` (new), `server/routes/admin.ts`

---

### 2.3 Legal Pages
**Priority:** Critical | **Effort:** 1.5 days

Terms of Service and Privacy Policy are legal requirements for any SaaS operating with EU or US users.

- Add `/terms` and `/privacy` routes in `src/App.tsx`
- Create `src/components/TermsPage.tsx` and `src/components/PrivacyPage.tsx`
- Link from footer of `SaaSLandingPage.tsx` and from signup flow in `SaaSAuth.tsx`
- Add cookie consent banner (GDPR requirement for EU users)

**Files:** `src/App.tsx`, `src/components/TermsPage.tsx` (new), `src/components/PrivacyPage.tsx` (new), `src/components/SaaSAuth.tsx`, `src/components/SaaSLandingPage.tsx`

---

### 2.4 GDPR Data Deletion
**Priority:** High | **Effort:** 1 day

Legal requirement — tenants and end-users must be able to request full data erasure.

- `DELETE /api/tenant/:id` — hard delete all: tenant record, conversations, KB chunks, leads, analytics, webhook logs
- DB cascade already handled by `ON DELETE CASCADE` FK constraints in schema
- Require explicit confirmation header `X-Confirm-Delete: true` to prevent accidental deletion
- Send confirmation email to tenant owner after deletion (uses 2.2)
- Superadmin can trigger deletion from tenant registry table

**Files:** `server/routes/admin.ts`

---

### 2.5 WhatsApp Setup Wizard
**Priority:** High | **Effort:** 3 days

Clients cannot connect WhatsApp without developer assistance today. The Meta Business setup process requires multiple steps across external systems.

- Five-step wizard with persistent state (can leave and resume):
  1. Meta Business Account — link with instructions + verification check
  2. WhatsApp Business App — install + link to Meta Business
  3. Phone number registration — enter and verify via Meta API
  4. Webhook URL verification — auto-populate URL, test verification handshake
  5. Test message — send a test message and confirm receipt in the UI
- Each step has status: `pending` / `in-progress` / `verified` / `error`
- Inline links to Meta documentation at each step
- Opt-out/STOP handling: detect STOP/UNSUBSCRIBE keywords in `server/routes/webhooks.ts`, mark lead as opted-out, suppress outbound messages

**Files:** `src/components/tabs/WhatsAppIntegrationTab.tsx`, `server/routes/webhooks.ts`

---

### 2.6 Uptime Monitoring + Status Page
**Priority:** High | **Effort:** 0.5 day

Clients need to know the platform is down without calling support.

- Register `/api/health` with UptimeRobot or Better Uptime (free tier)
- Create a public status page at `/status` (`src/components/StatusPage.tsx`) or use the monitoring service's hosted page
- Link from `SaaSLandingPage.tsx` footer and from error pages

**Files:** `src/components/StatusPage.tsx` (new), `src/components/SaaSLandingPage.tsx`

---

### 2.7 Empty States + Error States
**Priority:** High | **Effort:** 2 days

First-time users see blank tabs with no guidance — primary churn vector.

- Create reusable `src/components/ui/EmptyState.tsx` with icon, headline, body, and optional CTA button
- Create reusable `src/components/ui/SkeletonCard.tsx` using Tailwind `animate-pulse`
- Create `src/components/ErrorBoundary.tsx` wrapping each tab

**Per-tab empty states:**
- **Leads** — "No leads yet. Share your bot link or connect WhatsApp to start capturing." + "Connect WhatsApp" CTA
- **Knowledge Base** — "Your bot has no knowledge yet. Upload a document or add a URL." + "Add Content" CTA
- **Calendar** — "No appointments booked. Enable the booking page to let clients schedule." + "Enable Booking" CTA
- **Webhook Logs** — "No events yet. Send a test message to your bot to see activity here."
- **Insights** — "Not enough data yet. Dashboard populates after your first conversations."

**Files:** `src/components/ui/EmptyState.tsx` (new), `src/components/ui/SkeletonCard.tsx` (new), `src/components/ErrorBoundary.tsx` (new), each tab in `src/components/tabs/`

---

### 2.8 Onboarding Checklist Widget
**Priority:** Medium | **Effort:** 1 day

New tenants need a clear path from signup to first live conversation.

- Five-step checklist shown on first login: Connect WhatsApp → Add KB item → Set bot personality → Send test message → Go live
- Widget placed in the Overview tab / sidebar (dismissable once all steps done)
- Completion state persisted in tenant DB record as `onboarding_completed_steps: string[]`
- On completion, prompt to switch to Pro Mode (Track 3.1)

**Files:** `src/components/widgets/OnboardingChecklist.tsx` (new), `src/components/SaaSLayout.tsx`

---

### 2.9 WhatsApp Message Templates UI
**Priority:** Medium | **Effort:** 2 days

Outbound messages outside the 24-hour user-initiated window require Meta-approved templates. No template management UI exists today.

- Template CRUD in `WhatsAppIntegrationTab.tsx`: name, language, category, body text with variable placeholders
- Store templates in tenant DB record
- Show approval status from Meta API: `pending` / `approved` / `rejected`
- Automatically use an approved template when the bot needs to re-engage after 24h silence
- 24-hour window enforcement: track last user message timestamp per conversation, block non-template outbound after 24h

**Files:** `src/components/tabs/WhatsAppIntegrationTab.tsx`, `server/routes/admin.ts`, `server/services/whatsapp.ts`

---

## Track 3 — UI/UX Redesign

**Approach:** Progressive Disclosure Architecture — 4-tab Simple Mode for new/non-technical users, full 9-tab Pro Mode for power users. Dark theme kept and tightened. Polish fixes throughout.

### 3.1 Progressive Disclosure Navigation
**Priority:** High | **Effort:** 2 days

The current 9-item sidebar overwhelms first-time users. Split into two modes.

**Simple Mode** (default for new tenants):
| Tab | Content |
|-----|---------|
| Overview | Insights stats + quick-glance metrics |
| Bot & KB | Bot Config + Knowledge Base in a sub-tab shell |
| Leads | Leads tab (most-used daily) |
| Settings | WhatsApp setup + Billing collapsed here |

**Pro Mode** (all 9 current tabs, unlocked by toggle):
- All existing tabs available unchanged
- After onboarding checklist complete, prompt: *"You're all set — want to switch to Pro mode for full controls?"*

**Implementation:**
- `Simple ↔ Pro` pill toggle at sidebar bottom (replaces current role toggle position)
- Mode state persists in `localStorage` keyed by `tenantId`
- Role toggle (Admin / Support Agent) moves into user avatar menu in `SaasHeader.tsx`
- In Simple Mode, Bot Config + KnowledgeBaseTab render inside a shared sub-tab shell component

**Files:** `src/components/SaaSLayout.tsx`, `src/components/SaasHeader.tsx`, `src/context/SaaSContext.tsx`

---

### 3.2 Toast Notifications
**Priority:** High | **Effort:** 0.5 day

Replace all `alert()` / `window.confirm()` dialogs with a non-blocking toast system.

- Install `sonner` (lightest Tailwind-compatible toast library)
- Add `<Toaster />` to `src/App.tsx`
- Replace all `alert()` calls in `SaaSLayout.tsx` and tab components with `toast.success()` / `toast.error()`
- Use `toast.promise()` for async operations (KB crawl, calendar sync, file upload)

**Files:** `src/App.tsx`, `src/components/SaaSLayout.tsx`, all tab components that currently call `alert()`

---

### 3.3 Fix Broken Tailwind Classes + Design Tokens
**Priority:** Medium | **Effort:** 0.5 day

Several Tailwind class names in `SaaSLayout.tsx` reference non-existent shade values (Tailwind only has steps of 50, 100–900).

**Confirmed broken classes:**
- `text-slate-505` → `text-slate-500` (lines 290, 696)
- `text-emerald-450` → `text-emerald-400` (line 642)
- `text-rose-450` → `text-rose-400` (line 685)

**Design tokens** to add to `src/index.css` (`:root` and `.dark` blocks):
```css
--surface-base
--surface-card
--surface-elevated
--text-primary
--text-secondary
--accent-primary
--accent-success
--accent-danger
```
New components use these tokens; existing components migrate gradually — no forced big-bang migration.

**Files:** `src/index.css`, `src/components/SaaSLayout.tsx`

---

### 3.4 Mobile Navigation
**Priority:** Medium | **Effort:** 1 day

Two gaps in current mobile experience: WhatsApp status widget missing from mobile drawer, and no persistent bottom nav for common actions.

- Add WhatsApp connection status mini-widget (dot + phone number) to the top of the mobile drawer
- Add fixed bottom navigation bar on mobile (4 tabs: Overview, Leads, Bot, Settings) — replaces hamburger for primary actions
- Hamburger drawer remains for accessing Pro Mode tabs and admin actions

**Files:** `src/components/SaaSLayout.tsx`

---

### 3.5 Keyboard Navigation + Accessibility
**Priority:** Medium | **Effort:** 1 day

Color-only status indicators and missing focus rings fail WCAG 2.1 AA.

- Add `focus-visible:ring-2 focus-visible:ring-blue-500` to all interactive elements
- Add `aria-label` to all icon-only buttons
- Add `aria-current="page"` to the active sidebar item
- Supplement color-coded status dots with text labels (e.g. "● Connected" not just a green dot)
- Ensure all modals trap focus correctly (`focus-trap-react` or native `dialog` element)

**Files:** `src/components/SaaSLayout.tsx`, `src/components/tabs/*.tsx`

---

### 3.6 SaaSLayout.tsx Component Split
**Priority:** Low | **Effort:** 1 day

`SaaSLayout.tsx` at ~900 lines is hard to maintain. Extract into focused sub-components.

- `src/components/layout/Sidebar.tsx` — desktop sidebar nav
- `src/components/layout/MobileDrawer.tsx` — mobile slide-over nav
- `src/components/layout/DialerModal.tsx` — WebSocket voice dialer modal (~150 lines inline)
- `SaaSLayout.tsx` becomes an orchestrator under 200 lines

**Files:** `src/components/SaaSLayout.tsx` → `src/components/layout/`

---

## Track 4 — Superadmin Dashboard Upgrade

**Context:** `SaaSOwnerDashboard.tsx` (722 lines) has a good visual shell but all data is mocked — MRR uses a hardcoded formula, logs are simulated with `setInterval`, and health badges are hardcoded green. This track wires real data and adds financial + operational tooling.

**Chart library:** Recharts (already imported via `SaaSCharts.tsx` — no new dependency).

---

### 4.1 Real Data Layer
**Priority:** Critical | **Effort:** 1 day

- **MRR/ARR** — query Stripe for active subscription totals (requires Track 2.1)
- **Tenant count / active / suspended** — real DB query
- **Total leads / appointments** — aggregate DB query across all tenants
- **Growth rate** — month-over-month calculation from DB, not hardcoded `+14.6%`
- **Gateway logs** — stream real server logs via WebSocket or poll `/api/owner/logs`
- **Health badges** — call `/api/health` and render live status

**New endpoints:** `GET /api/owner/metrics`, `GET /api/owner/logs`

**Files:** `src/components/SaaSOwnerDashboard.tsx`, `server/routes/admin.ts`

---

### 4.2 Revenue & Finance Dashboard
**Priority:** Critical | **Effort:** 2 days

Dedicated finance panel with Recharts visualizations.

| Widget | Chart type | Data source |
|--------|-----------|-------------|
| MRR over time | AreaChart | Stripe, last 12 months |
| Revenue by plan tier | PieChart | Stripe, current month |
| New vs churned subscriptions | BarChart | Stripe, month-by-month |
| Churn rate | KPI card | Stripe |
| Cost vs revenue per tenant | BarChart | Gemini usage logs vs Stripe |
| Failed payments | Alert card + list | Stripe `past_due` subscriptions |

**New endpoints:** `GET /api/owner/revenue`, `GET /api/owner/costs`

**Files:** `src/components/owner/RevenuePanel.tsx` (new), `server/routes/admin.ts`

---

### 4.3 Subscription Management Panel
**Priority:** High | **Effort:** 1.5 days

Replace static pricing sliders with a real subscription table backed by Stripe.

- Table: tenant name, plan, status (active / trialing / past_due / canceled), billing date, MRR contribution
- Filter by status, plan tier, industry
- Per-tenant actions: extend trial, upgrade/downgrade plan, comp account (N months free), cancel
- `past_due` rows highlighted amber with "Contact" quick action
- Pricing configuration persisted to DB (currently lost on page reload)

**New endpoints:** `GET /api/owner/subscriptions`, `POST /api/owner/subscriptions/:id/override`, `POST /api/owner/subscriptions/:id/extend-trial`

**Files:** `src/components/owner/SubscriptionPanel.tsx` (new), `server/routes/admin.ts`, `server/services/stripe.ts`

---

### 4.4 Usage & Quota Dashboard
**Priority:** High | **Effort:** 1 day

Platform-wide visibility into usage and quota utilization.

- Platform totals: messages processed, KB chunks stored, leads, appointments (real DB aggregates)
- Per-tenant quota usage table with progress bars (messages used / limit, KB used / limit)
- Upsell candidates: tenants at >80% quota highlighted with "Suggest upgrade" action
- Over-quota tenants: currently not enforced — visibility layer comes first
- Bulk quota adjustment: select multiple tenants, set custom overrides

**New endpoint:** `GET /api/owner/usage`

**Files:** `src/components/owner/UsagePanel.tsx` (new), `server/routes/admin.ts`

---

### 4.5 Agent Performance Leaderboard
**Priority:** Medium | **Effort:** 1 day

Cross-tenant bot ranking — shows which clients get value and which need support intervention.

- Top bots by leads captured (tenant name, bot name, leads/week, appointments/week)
- Top bots by message volume
- Underperforming bots (<10 messages/week) — flagged for proactive outreach
- p50/p95 AI response time per tenant (from `analytics_events` table)
- Error rate per tenant (AI/webhook failures)

**Files:** `src/components/owner/AgentLeaderboard.tsx` (new), `server/routes/admin.ts`

---

### 4.6 AI Model & API Key Management
**Priority:** High | **Effort:** 2 days

Allow superadmin to rotate API keys and switch AI models from the dashboard — no redeployment required. Includes optional per-tenant BYOK (Bring Your Own Key).

**Platform-level controls (superadmin only):**
- Chat model selector: `gemini-2.0-flash`, `gemini-2.5-pro`, etc. (dropdown)
- Embedding model selector: `text-embedding-004`, etc. (dropdown)
- API key field: masked input, write-only (never returned in responses), stored via `server/services/encryption.ts` (AES-256-CBC)
- Key status display: last 4 characters + "last updated" timestamp
- "Test key" button: fires a minimal Gemini call, shows latency + pass/fail
- Future provider slots: OpenAI, Anthropic (UI pre-built, greyed out until implemented)

**Per-tenant BYOK (Pro plan only):**
- Tenant enters their own Gemini API key in `BotConfigTab.tsx`
- Stored encrypted in tenant DB record (`gemini_api_key` column)
- Tenant's conversations use their key, falling back to platform key if unset
- Superadmin sees BYOK flag in tenant registry; can revoke

**Security constraints:**
- Keys stored encrypted via existing `server/services/encryption.ts`
- Keys never returned in GET responses — write-only fields only
- Every key change written to audit log (who, when, which field)
- `server/services/gemini.ts` updated to accept optional per-request key override

**New endpoints:** `GET /api/owner/ai-config`, `PUT /api/owner/ai-config`, `POST /api/owner/ai-config/test`, `PUT /api/tenant/:id/ai-config`

**Files:** `src/components/owner/AIConfigPanel.tsx` (new), `src/components/tabs/BotConfigTab.tsx`, `server/services/gemini.ts`, `server/routes/admin.ts`, Drizzle schema

---

### 4.7 Platform Health (Real-time)
**Priority:** Medium | **Effort:** 0.5 day

Replace hardcoded green badges with live health data.

- Service status cards pull from `/api/health`: Firestore, Twilio, Gemini, Redis, PostgreSQL
- BullMQ queue metrics: pending / active / completed / failed jobs in last 24h
- Real gateway log stream via WebSocket (pino → WebSocket bridge replacing fake `setInterval` logs)
- API error rate mini-chart: last 24h error counts from DB or log aggregation

**Files:** `src/components/owner/PlatformHealthPanel.tsx` (new), `server/routes/admin.ts`

---

### 4.8 Superadmin Layout Refactor
**Priority:** Low | **Effort:** 0.5 day

`SaaSOwnerDashboard.tsx` at 722 lines with everything inline — split into panel components so each section is independently maintainable.

Extract:
- `src/components/owner/TenantRegistryTable.tsx`
- `src/components/owner/RevenuePanel.tsx`
- `src/components/owner/SubscriptionPanel.tsx`
- `src/components/owner/UsagePanel.tsx`
- `src/components/owner/AgentLeaderboard.tsx`
- `src/components/owner/AIConfigPanel.tsx`
- `src/components/owner/PlatformHealthPanel.tsx`

`SaaSOwnerDashboard.tsx` becomes a tab-shell orchestrator under 150 lines.

**Files:** `src/components/SaaSOwnerDashboard.tsx` → `src/components/owner/`

---

## Track 5 — Distribution & Growth

### 5.1 Embeddable Web Chat Widget
**Priority:** High | **Effort:** 3 days

The bot currently only exists on WhatsApp/Messenger/Telegram. An embeddable widget multiplies lead capture by putting the AI on the tenant's own website.

- Build a self-contained JS bundle (`dist/widget.js`) that tenants embed with a `<script>` tag
- Widget opens a chat bubble in the bottom-right corner, renders a conversation UI
- Communicates with the existing `/api/chat` endpoint (no new backend logic needed)
- Tenant copies a one-line embed snippet from `WhatsAppIntegrationTab.tsx` (or a new "Channels" tab)
- Widget inherits bot personality and KB from the tenant's config
- Customizable: bubble color, welcome message, avatar

**Files:** `src/widget/` (new), `vite.config.ts` (add widget build target), `src/components/tabs/WhatsAppIntegrationTab.tsx`

---

### 5.2 Public Bot Landing Page
**Priority:** Medium | **Effort:** 1 day

Each tenant gets a shareable chat URL (`/chat/:tenantId`) they can put in their WhatsApp bio, Instagram, or email signature.

- Builds on `BotSimulator.tsx` UI — create a stripped-down public-facing version
- Shows tenant branding (bot name, avatar, welcome message)
- No auth required for end users
- SEO-friendly meta tags for social sharing

**Files:** `src/components/PublicChatPage.tsx` (new), `src/App.tsx`, `server/routes/integrations.ts`

---

### 5.3 Tenant Monthly Report Email
**Priority:** Medium | **Effort:** 1 day

Automated email sent to each tenant on the 1st of every month summarizing platform value delivered.

Content: messages handled by AI, leads captured, appointments booked, estimated staff hours saved, bot uptime.

- BullMQ scheduled job runs on the 1st of each month (uses `scheduler.ts` from Track 1.3)
- Uses `server/services/email.ts` `sendMonthlyReport()` function (from Track 2.2)
- Data pulled from `analytics_events` table

**Files:** `server/workers/reportWorker.ts` (new), `server/services/email.ts`

---

### 5.4 CSV / Excel Data Export
**Priority:** High | **Effort:** 0.5 day

Every B2B client will request data export within 30 days of going live.

- `GET /api/tenant/:id/leads/export?format=csv` — exports leads table as CSV
- `GET /api/tenant/:id/conversations/export?format=csv` — exports conversation history
- `GET /api/tenant/:id/analytics/export?format=csv` — exports analytics events
- Download triggered from a button in `LeadsTab.tsx` and `InsightsTab.tsx`

**Files:** `server/routes/admin.ts`, `src/components/tabs/LeadsTab.tsx`, `src/components/tabs/InsightsTab.tsx`

---

## Track 6 — Tenant Team Collaboration

### 6.1 Multi-User Per Tenant
**Priority:** High | **Effort:** 4 days

The Admin/Support Agent role toggle is currently a UI illusion — only one Firebase Auth account exists per tenant. Real businesses have teams.

- Add `tenant_members` table to Drizzle schema: `(tenant_id, user_id, role, invited_at, accepted_at)`
- Roles: `owner`, `admin`, `agent` (read-only leads + conversations)
- Invite flow: owner enters email → invitation email sent via Resend → invitee signs up/in → linked to tenant
- `server/middleware/tenantAccess.ts` updated to allow any member of the tenant, not just owner
- Team management UI in a new `src/components/tabs/TeamTab.tsx`

**Files:** `src/components/tabs/TeamTab.tsx` (new), `server/middleware/tenantAccess.ts`, `server/routes/admin.ts`, `server/services/email.ts`, Drizzle schema

---

### 6.2 Conversation Assignment & Internal Notes
**Priority:** Medium | **Effort:** 2 days

Agents need to claim conversations, add internal notes, and mark threads resolved. The Leads tab becomes a real CRM inbox.

- Add `assigned_to` (user_id), `status` (open / assigned / resolved), and `internal_notes` fields to conversations
- In `LeadsTab.tsx`: claim button, resolve button, internal note input (not visible to end user)
- Notification to assigned agent when a conversation is assigned to them

**Files:** `src/components/tabs/LeadsTab.tsx`, `server/routes/admin.ts`, Drizzle schema

---

## Track 7 — Integration Ecosystem

### 7.1 Zapier / Make Webhook Output
**Priority:** High | **Effort:** 1 day

Let tenants connect to 5,000+ apps without custom integrations. When a lead is captured or an appointment booked, fire a POST to the tenant's configured webhook URL.

- Add `outbound_webhook_url` field to tenant config
- On `lead.created` and `appointment.created` events, enqueue a `webhook-retry` job in BullMQ (Track 1.3)
- Job POSTs event payload with 3 retries and exponential backoff
- UI: webhook URL input + "Send test event" button in a new Integrations section of `BotConfigTab.tsx`

**Files:** `server/workers/messageWorker.ts`, `src/components/tabs/BotConfigTab.tsx`, Drizzle schema

---

### 7.2 WhatsApp Broadcast Campaigns
**Priority:** Medium | **Effort:** 2 days

Turn the platform from reactive (only replies) to proactive (also reaches out). Tenants can send approved template messages to their lead list.

- Campaign builder in `WhatsAppIntegrationTab.tsx`: select audience (all leads / filtered), pick approved template, schedule time
- Sends via BullMQ `outbound-message` queue (respects per-tenant rate limit)
- Campaign status tracking: sent, delivered, read, failed per recipient
- Requires Meta-approved templates (Track 2.9)

**Files:** `src/components/tabs/WhatsAppIntegrationTab.tsx`, `server/routes/admin.ts`, `server/services/whatsapp.ts`

---

## Track 8 — AI & Bot Quality

### 8.1 Human Handoff Protocol
**Priority:** High | **Effort:** 2 days

When the bot reaches a confidence threshold or the user explicitly asks for a human, it should gracefully escalate.

- Bot detects handoff triggers: explicit request ("talk to a human"), repeated failure to answer, specific keywords
- On trigger: pause AI replies for that conversation thread, send handoff notification to assigned agent (or all agents if unassigned), flag conversation in `LeadsTab.tsx` with "Needs Human" badge
- Agent takes over by clicking "Take over" — bot stays silent until agent clicks "Return to Bot"
- State stored in conversation record: `handoff_status`, `handoff_at`, `handoff_agent_id`

**Files:** `server/routes/webhooks.ts`, `src/components/tabs/LeadsTab.tsx`, Drizzle schema

---

### 8.2 Conversation Quality Scoring
**Priority:** Medium | **Effort:** 1.5 days

Automatically score each completed conversation using Gemini to surface quality issues.

- After conversation ends (24h inactivity or explicit close), enqueue a `score-conversation` BullMQ job
- Job sends conversation transcript to Gemini with a structured scoring prompt: was the user's question answered? was a lead captured? did the bot hallucinate? tone quality (1–5)
- Scores stored in `conversations` table: `quality_score`, `hallucination_flag`, `lead_captured`
- Surfaced in `LeadsTab.tsx` per conversation and aggregated in `InsightsTab.tsx`
- Low-scoring conversations flagged for human review in superadmin leaderboard (Track 4.5)

**Files:** `server/workers/scoringWorker.ts` (new), `server/routes/admin.ts`, Drizzle schema

---

### 8.3 KB Auto-Sync
**Priority:** Medium | **Effort:** 1 day

Instead of manual crawl triggers, detect when a KB source URL has new content and re-crawl automatically.

- On each scheduled crawl job, check `ETag` / `Last-Modified` headers before re-fetching
- Only re-chunk and re-embed if content has changed (reduces Gemini embedding API cost)
- Store `etag` and `last_modified` per KB item in the DB
- UI: show "Last synced" timestamp per KB item in `KnowledgeBaseTab.tsx`

**Files:** `server/workers/crawlWorker.ts`, `server/services/rag.ts`, Drizzle schema

---

### 8.4 Prompt A/B Testing
**Priority:** Low | **Effort:** 2 days

Let tenants experiment with two bot personalities and compare lead conversion rates.

- Tenant defines Variant A (current prompt) and Variant B (experimental prompt) in `BotConfigTab.tsx`
- Conversations split 50/50 by conversation ID parity
- After 7 days, show comparison in `InsightsTab.tsx`: messages, leads, quality scores per variant
- Winner can be promoted to default with one click

**Files:** `src/components/tabs/BotConfigTab.tsx`, `src/components/tabs/InsightsTab.tsx`, `server/routes/webhooks.ts`

---

## Effort Summary

| Track | Items | Effort |
|-------|-------|--------|
| Track 1 — Tech Stack Hardening | 6 items | ~5.5 days |
| Track 2 — Client Readiness | 9 items | ~14.5 days |
| Track 3 — UI/UX Redesign | 6 items | ~6 days |
| Track 4 — Superadmin Dashboard | 8 items | ~9.5 days |
| Track 5 — Distribution & Growth | 4 items | ~5.5 days |
| Track 6 — Team Collaboration | 2 items | ~6 days |
| Track 7 — Integration Ecosystem | 2 items | ~3 days |
| Track 8 — AI & Bot Quality | 4 items | ~6.5 days |
| **Total** | **41 items** | **~56 days** |

---

## Recommended Build Order

Build order respects dependencies (e.g. Stripe must exist before financial widgets, BullMQ before email workers).

### Phase 1 — Foundation (Weeks 1–2)
1. Observability: pino + Sentry (1.1)
2. Tenant access middleware + RLS (1.2)
3. BullMQ + Redis job queue (1.3)
4. Analytics + webhook events → PostgreSQL (1.4)

### Phase 2 — Revenue (Weeks 3–4)
5. Stripe billing + paywall (2.1)
6. Transactional email via Resend (2.2)
7. Legal pages + GDPR deletion (2.3, 2.4)
8. CSV data export (5.4) — quick win, often requested immediately after billing

### Phase 3 — Client Onboarding (Weeks 5–6)
9. WhatsApp setup wizard (2.5)
10. Empty states + error states + skeleton loaders (2.7)
11. Onboarding checklist widget (2.8)
12. Uptime monitoring + status page (2.6)

### Phase 4 — Superadmin (Weeks 7–8)
13. Superadmin real data layer (4.1)
14. Revenue & finance dashboard (4.2)
15. Subscription management panel (4.3)
16. AI model & API key management (4.6)
17. Usage & quota dashboard (4.4)
18. Agent performance leaderboard (4.5)

### Phase 5 — UI/UX (Weeks 9–10)
19. Progressive disclosure navigation (3.1)
20. Toast notifications — replace alert() (3.2)
21. Fix broken Tailwind classes + design tokens (3.3)
22. Mobile bottom nav (3.4)
23. Accessibility fixes (3.5)
24. SaaSLayout.tsx split (3.6)
25. Superadmin layout refactor (4.8)

### Phase 6 — Growth & Retention (Weeks 11–14)
26. Embeddable web chat widget (5.1)
27. Public bot landing page (5.2)
28. Multi-user per tenant (6.1)
29. Zapier/Make webhook output (7.1)
30. Human handoff protocol (8.1)
31. WhatsApp message templates UI (2.9)
32. Conversation assignment + internal notes (6.2)
33. Monthly report email (5.3)
34. Platform health real-time (4.7)

### Phase 7 — Advanced Features (Weeks 15–17)
35. KB auto-sync (8.3)
36. Conversation quality scoring (8.2)
37. WhatsApp broadcast campaigns (7.2)
38. CI/CD pipeline completion (1.5)
39. Per-tenant rate limiting (1.6)
40. Prompt A/B testing (8.4)
41. Platform health real-time panel (4.7)

---

## Key Dependencies Map

```
BullMQ (1.3) ──► Email (2.2) ──► Monthly reports (5.3)
              └─► Webhook retries (7.1)
              └─► Quality scoring (8.2)
              └─► Broadcast campaigns (7.2)

Stripe (2.1) ──► Superadmin finance (4.2)
             └─► Subscription management (4.3)
             └─► Paywall enforcement (2.1)

Multi-user (6.1) ──► Conversation assignment (6.2)
                 └─► Team notifications (8.1)

WhatsApp templates (2.9) ──► Broadcast campaigns (7.2)
```

---

## Verification Checklist (per track)

- [ ] `npm run test` passes after each item
- [ ] `npm run build` succeeds (no type errors)
- [ ] New API endpoints tested with `X-Test-Auth-Bypass: true` in `tests/backend.test.ts`
- [ ] New UI components have at least one render test in `tests/frontend.test.tsx`
- [ ] No new `console.log` calls — use `pino` logger after Track 1.1
- [ ] No plaintext API keys anywhere — all through `server/services/encryption.ts`
- [ ] No new `alert()` calls — use `sonner` toasts after Track 3.2
