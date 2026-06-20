import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import helmet from "helmet";
import cors from "cors";

import { PORT } from "./server/config";
import { apiLimiter, webhookLimiter } from "./server/middleware/rateLimit";
import { readTenantsStore, writeTenantsStore } from "./server/services/db";
import { setupWebSocket } from "./server/services/websocket";
import router from "./server/routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.APP_URL || true }));
app.use(express.json({ limit: "1mb" }));

// Rate Limiters mounting
app.use("/api/webhook", webhookLimiter);
app.use("/api/", (req, res, next) => {
  if (req.path.startsWith("/webhook")) {
    return next();
  }
  return apiLimiter(req, res, next);
});

// Mount the modular routes index
app.use("/", router);

// Re-export utility functions imported by tests to preserve the public API
export { encryptText, decryptText } from "./server/services/encryption";
export { chunkText, cosineSimilarity } from "./server/services/rag";

// Setup Vite Dev Server / Static Assets handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Multi-Tenant SaaS Engine running on http://localhost:${PORT}`);
  });

  setupWebSocket(server);

  // Background crawl scheduler worker
  setInterval(async () => {
    try {
      const store = await readTenantsStore();
      const now = new Date();
      let updated = false;

      for (const tenantId of Object.keys(store)) {
        const tenant = store[tenantId];
        if (tenant.crawlSchedule && tenant.crawlSchedule !== 'none') {
          // Find any existing URL/crawl knowledge base item
          const targetItem = tenant.knowledgeBase?.find((kb: any) => kb.type === 'crawl' || kb.type === 'url');
          if (!targetItem || !targetItem.url) continue;

          // Determine interval threshold: Daily (2 minutes in dev/test, else 24 hours), Weekly (5 minutes in dev/test, else 7 days)
          const isDev = process.env.NODE_ENV !== 'production';
          const intervalMs = tenant.crawlSchedule === 'daily'
            ? (isDev ? 2 * 60 * 1000 : 24 * 60 * 60 * 1000)
            : (isDev ? 5 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000);

          const lastCrawl = tenant.lastCrawlTime ? new Date(tenant.lastCrawlTime) : new Date(0);
          if (now.getTime() - lastCrawl.getTime() >= intervalMs) {
            console.log(`[SCHEDULED CRAWLER] Triggering scheduled crawl for tenant "${tenantId}" on schedule: ${tenant.crawlSchedule}`);
            
            // Execute simulated crawl logic inline
            const pageTitle = "Auto-Synced Business Catalogue";
            const mockContent = `Dynamic catalog snapshot generated automatically on schedule: ${tenant.crawlSchedule}.\nIndexed on: ${now.toISOString()}.\nServices and product ranges have been fully re-verified and synchronized to vectors.`;
            
            const newKbItem = {
              id: `sched-kb-${Math.floor(100000 + Math.random() * 900000)}`,
              type: "crawl" as const,
              title: pageTitle,
              content: mockContent,
              dateAdded: now.toISOString().split('T')[0],
              url: targetItem.url,
              crawlDepth: 1,
              crawlStatus: "synced" as const,
              crawlPagesCount: 3,
              chunks: [
                { text: pageTitle },
                { text: mockContent }
              ]
            };

            tenant.knowledgeBase = tenant.knowledgeBase || [];
            // Remove previous scheduled crawl items of same URL
            tenant.knowledgeBase = tenant.knowledgeBase.filter((kb: any) => !(kb.type === 'crawl' && kb.title === pageTitle));
            tenant.knowledgeBase.push(newKbItem);

            tenant.lastCrawlTime = now.toISOString();
            store[tenantId] = tenant;
            updated = true;
            console.log(`[SCHEDULED CRAWLER] Scheduled crawl completed for "${tenantId}". Document synchronized.`);
          }
        }
      }

      if (updated) {
        await writeTenantsStore(store);
      }
    } catch (err) {
      console.error("[SCHEDULED CRAWLER] Exception in background crawl scheduler:", err);
    }
  }, 15000); // Check every 15 seconds
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export { app };
