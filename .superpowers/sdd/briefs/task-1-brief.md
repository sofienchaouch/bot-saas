# Task 1: Structured Logging with Pino

## Context
This is Task 1 of 10 in the Aura platform Track 1 tech-stack hardening. The project is a full-stack TypeScript monorepo: Express backend + React SPA. You are adding pino structured logging to replace all `console.log/error` calls.

## Global Constraints
- `npm install` ALWAYS requires `--legacy-peer-deps`
- Never use `console.log` after this task — pino logger only
- TypeScript strict mode — no untyped `any` without explicit cast
- Tests run with `npm run test` (vitest)
- Working directory: `c:/Users/PC/Documents/projects/whatsapp-ai-agent-saas-platform`

## Files
- **Create:** `server/lib/logger.ts` — pino singleton exported as `logger`
- **Modify:** `server/middleware/errorHandler.ts` — replace `console.error` with `logger.error`
- **Modify:** `server/middleware/auth.ts` — replace `console.error` with `logger.warn`; also fix auth bypass bug (currently bypasses in all non-production, must bypass ONLY in `NODE_ENV === 'test'` with `X-Test-Auth-Bypass: true` header)

## Current file contents

### server/middleware/errorHandler.ts (current)
```typescript
import { Request, Response, NextFunction } from "express";

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[GLOBAL ERROR HANDLER]", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({
    status: "error",
    statusCode: status,
    message: message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
};
```

### server/middleware/auth.ts (current)
```typescript
import express from "express";
import admin from "firebase-admin";
import { NODE_ENV } from "../config";

export async function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (NODE_ENV !== "production") {
      return next();
    }
    return res.status(401).json({ error: "Unauthorized: Missing auth token" });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (err) {
    console.error("Firebase auth verification failed:", err);
    return res.status(401).json({ error: "Unauthorized: Invalid auth token" });
  }
}
```

### server/config.ts exports
`NODE_ENV`, `PORT`, `ENCRYPTION_KEY`, `GEMINI_API_KEY`, `DATABASE_URL`, etc. All via Zod-validated env.

## What to implement

### 1. Install pino
```bash
npm install pino --legacy-peer-deps
npm install --save-dev pino-pretty --legacy-peer-deps
```

### 2. Create `server/lib/logger.ts`
```typescript
import pino from 'pino';
import { NODE_ENV } from '../config';

export const logger = pino({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  transport: NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
    : undefined,
});
```

### 3. Update `server/middleware/errorHandler.ts`
```typescript
import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({
    status: "error",
    statusCode: status,
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
```

### 4. Update `server/middleware/auth.ts`
```typescript
import express from "express";
import admin from "firebase-admin";
import { NODE_ENV } from "../config";
import { logger } from "../lib/logger";

export async function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Only bypass in test mode with explicit header
  if (NODE_ENV === "test" && req.headers["x-test-auth-bypass"] === "true") {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing auth token" });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (err) {
    logger.warn({ err }, "Firebase auth verification failed");
    return res.status(401).json({ error: "Unauthorized: Invalid auth token" });
  }
}
```

### 5. Add tests to `tests/backend.test.ts`
Add this describe block:
```typescript
import { logger } from '../server/lib/logger';

describe('logger', () => {
  it('exports a pino logger with expected methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it('child logger inherits parent bindings', () => {
    const child = logger.child({ tenantId: 'test-123' });
    expect(typeof child.info).toBe('function');
  });
});
```

## TDD Order
1. Add test → run → see it fail (module not found)
2. Create `server/lib/logger.ts`
3. Run test → see it pass
4. Update errorHandler.ts
5. Update auth.ts
6. Run full test suite → all pass
7. Commit

## Commit message
```
feat: add pino structured logger, fix auth bypass scope
```

## Report file
Write your full report to: `.superpowers/sdd/briefs/task-1-report.md`

## Report format
```
STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
COMMITS: <sha1> <sha2> ...
TESTS: X passed, 0 failed
CONCERNS: (if any)
```
