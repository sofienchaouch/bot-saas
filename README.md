<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />

# 📞 Aura - WhatsApp Business AI Agent SaaS Platform

*A secure, multi-tenant SaaS platform enabling businesses to deploy custom-tailored Gemini AI agents over WhatsApp. Featuring RAG (Retrieval-Augmented Generation), CRM pipelines, automated scheduling, and Support Agent Role-Based Access Control (RBAC).*
</div>

---

## 🌟 Overview

**Aura** is a premium, state-of-the-art Multi-Tenant SaaS platform designed to build, configure, simulate, and deploy WhatsApp AI Chatbots for modern businesses. By leveraging the latest Google Gemini models and a customizable, vertical-specific RAG system, Aura empowers businesses to automatically answer client FAQs, capture leads into a CRM pipeline, and schedule appointments on their calendars without manual intervention.

---

## 🚀 Key Features

*   **Multi-Tenant Isolation & Sandbox**: Complete logical separation of tenant configurations, client databases, welcome messages, private knowledge bases, and appointment books.
*   **Vertical-Specific Presets**: Native optimization and custom instruction generators for several industries:
    *   💪 **Fitness & Gyms** (Membership pricing, hours, facility FAQ, appointment booking)
    *   🥼 **Healthcare & Wellness** (Consultation costs, insurance guidelines, screening checks)
    *   ⚖️ **Legal & Advisory** (Hourly rates, retainers, escrow policies, NDA reviews)
    *   🛒 **E-Commerce** (Product catalogs, shipping budgets, return guidelines, direct checkout triggers)
    *   🏡 **Real Estate & Realty** (Lofts/penthouses, commission guidelines, home tours)
    *   🎓 **Education & Tutoring** (Algebra/Calculus pricing, cancellation rules, homework workflows)
*   **Advanced RAG (Retrieval-Augmented Generation) Engine**: 
    *   Uses Google's `text-embedding-004` via `@google/genai` to split and represent company knowledge.
    *   Calculates similarity scores using a built-in vector cosine similarity algorithm.
    *   Performs offline keyword search fallbacks if API limits or credentials expire.
*   **Smart Crawlers (Web & Social)**: 
    *   Auto-parse clean markdown texts from URL pathways.
    *   Fetch and index public Instagram, Facebook, and Web feeds into vector chunks for the RAG database.
*   **Role-Based Access Control (RBAC)**:
    *   **Admin**: Unrestricted control to alter tokens, update workspace properties, delete leads, and view clean configuration values.
    *   **Support Agent**: Read-only restrictions. Sensitive tokens (like Meta Permanent System Tokens) are dynamically masked (`••••••••••••••••`), and system modification/deletion buttons are disabled.
*   **Real-time Bot Simulator**: Interactively test and inspect the chatbot's system instructions, RAG outputs, and lead qualifications directly within the admin dashboard. Support for manual takeover and live agent messaging.
*   **Interactive Analytics Dashboard**: Visualizes pipeline statistics, leads captured over time, appointment densities, active channels, and platform usage metrics.
*   **Google Calendar & CRM Sync**: Prevent appointment scheduling overlaps with date constraints and automatically capture and qualify prospective leads in real-time.

---

## 🛠️ Technology Stack

*   **Frontend UI/UX**:
    *   React 19 + TypeScript
    *   TailwindCSS (Vite integration for premium responsive layouts)
    *   Recharts (Responsive data visualizations)
    *   Framer Motion (Smooth transitions, state changes, and hover actions)
    *   Lucide React (Modern icons)
*   **Backend Server**:
    *   Express.js + Node.js (Vite Dev Server configuration)
    *   Firebase Admin SDK (Bypasses browser client restrictions)
    *   WebSocket (`ws` implementation for push-based webhook logs)
*   **Database & Storage**:
    *   Google Cloud Firestore (Production Cloud Database)
    *   Local JSON database sandboxes (`tenants_store.json`, `webhook_conversations.json`) for seamless local offline execution.

---

## 📂 Project Structure

```bash
whatsapp-ai-agent-saas-platform/
├── src/
│   ├── components/            # UI components
│   │   ├── BotSimulator.tsx          # Real-time message console & manual overrides
│   │   ├── CalendarBookingPage.tsx   # Public booking scheduler for clients
│   │   ├── SaaSAuth.tsx              # SignIn/SignUp & preset vertical generators
│   │   ├── SaaSCharts.tsx            # CRM analytics and visualization grids
│   │   ├── SaaSLandingPage.tsx       # Marketing page and quick demo entries
│   │   ├── SaaSLayout.tsx            # Main admin panel with tab routes and RBAC
│   │   ├── SaaSOwnerDashboard.tsx    # Global platform status & tenant management
│   │   ├── SaasHeader.tsx            # Interactive navbar with role status
│   │   ├── WhatsAppStatusIndicator.tsx # Webhook health indicator
│   │   └── WorkspaceHub.tsx          # Private KB uploader, crawlers & agent setup
│   ├── App.tsx                # App routing & tenant database synchronization
│   ├── LanguageContext.tsx    # Context for localized strings (i18n)
│   ├── defaultData.ts         # Preset tenant configurations for instant demo
│   ├── firebase.ts            # Client-side Firebase initializers
│   ├── googleCalendar.ts      # Google Calendar API helpers (Google Auth scopes)
│   ├── googleWorkspace.ts     # Workspace credential configurations
│   └── index.css              # Global styles & layout tokens
├── tests/
│   ├── setup.ts               # Test configurations
│   ├── backend.test.ts        # RAG, Encryption, and API Route integration tests
│   └── frontend.test.tsx      # RBAC, auth, and state persistence UI tests
├── firestore.rules            # Firestore security rules
├── security_spec.md           # Firestore rule invariants & threat model spec
├── server.ts                  # Express server with RAG, mock crawler & API endpoints
├── tsconfig.json              # TypeScript compilation rules
├── vite.config.ts             # Vite bundler options
└── package.json               # Dependencies and scripts
```

---

## ⚙️ Local Installation & Running

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18+)
*   Gemini API Key (Get one from [Google AI Studio](https://aistudio.google.com/))

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/whatsapp-ai-agent-saas-platform.git
cd whatsapp-ai-agent-saas-platform
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and specify the following configurations:
```env
GEMINI_API_KEY=your_gemini_api_key_here
WHATSAPP_TOKEN=dummy_meta_system_token
WHATSAPP_VERIFY_TOKEN=aura_platform_verify_token_2026
ENCRYPTION_KEY=aura_platform_encryption_master_key_2026
PORT=3000
```

### 3. Run Locally (Vite + TSX Server)
Start the project locally using:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser to view the platform.

*   To access the **Platform Owner Dashboard**, log in with `owner@saas.com`.
*   To explore a preloaded vertical, click **"Instant Demo Dashboard"** on the landing page.

---

## 🔒 Security Architecture & Firestore Invariants

Aura is designed with a zero-trust architecture to prevent data leaks between tenants. Security specs details are defined in [security_spec.md](security_spec.md).

### Firestore Security Rules
All direct client reads/writes are locked down in `firestore.rules`.
*   **Multi-Tenant Isolation**: A tenant cannot read or write properties belonging to another tenant.
*   **Immutability**: Crucial creation dates and relational IDs cannot be changed.
*   **Verification**: Prevents clients from updating administrative configurations (e.g. bypassing sandboxes, modifying subscription statuses, or spoofing admin credentials).
*   **Fail-Safe Local Storage**: In environments without active Google Cloud Service account credentials, the backend server seamlessly activates encrypted local JSON databases (`tenants_store.json`).

---

## 🧪 Testing

The platform is backed by comprehensive integration and unit tests using **Vitest**.

To run all tests:
```bash
npm run test
```

### Verified Scenarios
*   **RAG Engine Utilities**: Validates cosine similarity vector logic and text chunk slicing.
*   **Data Encryption**: Ensures credentials and CRM details are encrypted before storing and decrypted on fetch.
*   **RBAC Security (Frontend)**: Asserts that Support Agents are unable to view unmasked credentials or trigger delete queries.
*   **CRM Lead Pipelines**: Confirms appointments booked on the public schedule automatically create qualified leads in the dashboard.
