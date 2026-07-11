#!/usr/bin/env tsx
/**
 * Operator backfill: assigns a Firebase UID as owner of tenants that have no
 * owner yet (owner_id IS NULL). Complements the claim-on-first-access flow in
 * server/middleware/tenantAccess.ts for deployments that want to assign
 * ownership explicitly.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/backfill-owner.ts <firebase-uid> [tenantId ...]
 *
 * With no tenant ids, all unowned tenants are assigned to <firebase-uid>.
 */

import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required.');
  process.exit(1);
}

import { and, inArray, isNull } from 'drizzle-orm';
import { getDb, schema } from '../server/db/index';
import { runMigrations } from '../server/db/migrate';

async function main() {
  const [uid, ...tenantIds] = process.argv.slice(2);
  if (!uid) {
    console.error('Usage: tsx scripts/backfill-owner.ts <firebase-uid> [tenantId ...]');
    process.exit(1);
  }

  console.log('[BACKFILL] Running database migrations...');
  await runMigrations();

  const db = getDb();
  const where =
    tenantIds.length > 0
      ? and(isNull(schema.tenants.ownerId), inArray(schema.tenants.id, tenantIds))
      : isNull(schema.tenants.ownerId);

  const targets = await db
    .select({ id: schema.tenants.id, name: schema.tenants.name })
    .from(schema.tenants)
    .where(where);

  if (targets.length === 0) {
    console.log('[BACKFILL] No unowned tenants matched. Nothing to do.');
    process.exit(0);
  }

  await db.update(schema.tenants).set({ ownerId: uid }).where(where);

  for (const t of targets) {
    console.log(`[BACKFILL] ${t.id} (${t.name}) → owner ${uid}`);
  }
  console.log(`[BACKFILL] Done. ${targets.length} tenant(s) updated.`);
  process.exit(0);
}

main().catch(err => {
  console.error('[BACKFILL] Failed:', err);
  process.exit(1);
});
