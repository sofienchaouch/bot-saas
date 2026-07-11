import { eq } from "drizzle-orm";
import { getDb, isDbAvailable, schema } from "../db/index";

export interface TeamMember {
  id: string;
  tenantId: string;
  uid: string;
  email: string;
  role: "admin" | "support";
  invitedAt: string;
}

// In-memory fallback, mirrors the pattern used for tenants/conversations in db.ts
const _memTeamMembers: Map<string, TeamMember[]> = new Map();

export function _clearMemTeamMembers(): void {
  _memTeamMembers.clear();
}

export async function listTeamMembers(tenantId: string): Promise<TeamMember[]> {
  if (!isDbAvailable()) {
    return _memTeamMembers.get(tenantId) ?? [];
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.tenantId, tenantId));

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    uid: r.uid,
    email: r.email,
    role: r.role as TeamMember["role"],
    invitedAt: r.invitedAt?.toISOString() ?? new Date().toISOString(),
  }));
}

export async function addTeamMember(
  tenantId: string,
  uid: string,
  email: string,
  role: "admin" | "support"
): Promise<TeamMember> {
  const member: TeamMember = {
    id: `tm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tenantId,
    uid,
    email,
    role,
    invitedAt: new Date().toISOString(),
  };

  if (!isDbAvailable()) {
    const list = _memTeamMembers.get(tenantId) ?? [];
    list.push(member);
    _memTeamMembers.set(tenantId, list);
    return member;
  }

  const db = getDb();
  await db.insert(schema.teamMembers).values({
    id: member.id,
    tenantId,
    uid,
    email,
    role,
  });
  return member;
}

export async function removeTeamMember(tenantId: string, memberId: string): Promise<void> {
  if (!isDbAvailable()) {
    const list = _memTeamMembers.get(tenantId) ?? [];
    _memTeamMembers.set(
      tenantId,
      list.filter((m) => m.id !== memberId)
    );
    return;
  }

  const db = getDb();
  await db
    .delete(schema.teamMembers)
    .where(eq(schema.teamMembers.id, memberId));
}

/** Returns the member's role if uid belongs to tenantId's team, else null. */
export async function findTeamMemberRole(tenantId: string, uid: string): Promise<string | null> {
  const members = await listTeamMembers(tenantId);
  return members.find((m) => m.uid === uid)?.role ?? null;
}
