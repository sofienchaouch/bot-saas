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
