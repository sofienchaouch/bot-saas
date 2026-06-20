import { eq, inArray } from "drizzle-orm";
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

export async function readTenantsStore(): Promise<Record<string, any>> {
  if (!isDbAvailable()) {
    const result: Record<string, any> = {};
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

  const result: Record<string, any> = {};
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
