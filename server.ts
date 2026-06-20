import * as Sentry from "@sentry/node";
import { SENTRY_DSN, NODE_ENV, PORT } from "./server/config";

if (SENTRY_DSN && NODE_ENV === "production") {
  Sentry.init({ dsn: SENTRY_DSN, environment: NODE_ENV });
}

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import helmet from "helmet";
import cors from "cors";
import { requestIdMiddleware } from "./server/middleware/requestId";
import { apiLimiter, webhookLimiter } from "./server/middleware/rateLimit";
import { setupWebSocket } from "./server/services/websocket";
import { startScheduler } from "./server/services/scheduler";
import { startCrawlWorker } from "./server/workers/crawlWorker";
import { logger } from "./server/lib/logger";
import router from "./server/routes";
import { errorHandler } from "./server/middleware/errorHandler";
import { runMigrations } from "./server/db/migrate";

const app = express();

app.use(requestIdMiddleware);

app.use(helmet());
app.use(cors({ origin: process.env.APP_URL || true }));
app.use(express.json({ 
  limit: "1mb",
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

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

// Mount the global error handler middleware
app.use(errorHandler);

// Re-export utility functions imported by tests to preserve the public API
export { encryptText, decryptText } from "./server/services/encryption";
export { chunkText, cosineSimilarity } from "./server/services/rag";

// Setup Vite Dev Server / Static Assets handling
async function startServer() {
  await runMigrations();

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
    logger.info({ port: PORT }, 'Server started');
  });

  setupWebSocket(server);

  startScheduler();
  startCrawlWorker();
  logger.info('Background workers started');
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export { app };
