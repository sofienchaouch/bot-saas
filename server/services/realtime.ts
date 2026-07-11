import { WebSocket } from "ws";
import { logger } from "../lib/logger";

// Lightweight per-tenant pub/sub for pushing admin-dashboard updates (new
// webhook events, new conversation messages) over WebSocket instead of the
// dashboard having to poll REST endpoints on a timer.
const tenantClients: Map<string, Set<WebSocket>> = new Map();

export function registerAdminClient(tenantId: string, ws: WebSocket): void {
  let set = tenantClients.get(tenantId);
  if (!set) {
    set = new Set();
    tenantClients.set(tenantId, set);
  }
  set.add(ws);

  ws.on("close", () => {
    set!.delete(ws);
    if (set!.size === 0) tenantClients.delete(tenantId);
  });
}

export function broadcastToTenant(tenantId: string, message: { type: string; payload: unknown }): void {
  const set = tenantClients.get(tenantId);
  if (!set || set.size === 0) return;

  const data = JSON.stringify(message);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(data);
      } catch (err) {
        logger.warn({ err, tenantId }, "[REALTIME] Failed to send to admin client");
      }
    }
  }
}
