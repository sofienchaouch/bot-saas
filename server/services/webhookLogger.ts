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
