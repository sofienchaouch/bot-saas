# Task 3: Sentry Error Tracking

## Context
Task 3 of 10. Aura platform — TypeScript Express monorepo. Tasks 1-2 added pino logging and correlation IDs. Now add Sentry error tracking — no-op when `SENTRY_DSN` env var is not set (graceful degradation).

## Global Constraints
- `npm install` ALWAYS requires `--legacy-peer-deps`
- Use `logger` from `server/lib/logger.ts` — never `console.log`
- Sentry must be a no-op (no crash, no error) when `SENTRY_DSN` is not set
- Sentry init only in `NODE_ENV === 'production'`
- TypeScript strict mode
- Tests run with `npm run test` (vitest)
- Working directory: `c:/Users/PC/Documents/projects/whatsapp-ai-agent-saas-platform`

## Files
- **Modify:** `server/config.ts` — add `SENTRY_DSN` optional env var
- **Modify:** `server/middleware/errorHandler.ts` — add `Sentry.captureException`
- **Modify:** `server.ts` — init Sentry before all other code

## Install
```bash
npm install @sentry/node --legacy-peer-deps
```

## Changes

### 1. `server/config.ts` — add to Zod schema
Add `SENTRY_DSN: z.string().url().optional()` to the schema object.
Add `SENTRY_DSN` to the destructured export line.

### 2. `server.ts` — Sentry init at the very top
Add these lines BEFORE all other imports (Sentry must load first):
```typescript
import * as Sentry from '@sentry/node';
import { SENTRY_DSN, NODE_ENV } from './server/config';

if (SENTRY_DSN && NODE_ENV === 'production') {
  Sentry.init({ dsn: SENTRY_DSN, environment: NODE_ENV });
}
```

### 3. `server/middleware/errorHandler.ts` — capture in production
```typescript
import { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { logger } from "../lib/logger";

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(err);
  }

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

## Tests
No new tests needed — Sentry is a no-op without a DSN. Verify existing 32 tests still pass after changes.

## TDD Order
1. Install `@sentry/node`
2. Update `server/config.ts`
3. Update `server.ts`
4. Update `server/middleware/errorHandler.ts`
5. Run full test suite → all 32 pass
6. Commit

## Commit message
```
feat: add Sentry error tracking (no-op without SENTRY_DSN)
```

## Report file
Write your full report to: `.superpowers/sdd/briefs/task-3-report.md`

## Report format
```
STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
COMMITS: <sha1> ...
TESTS: X passed, 0 failed
CONCERNS: (if any)
```
