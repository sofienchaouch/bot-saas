import { eq, sql } from "drizzle-orm";
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
