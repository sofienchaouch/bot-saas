# Task 2: Request Correlation IDs

## Context
Task 2 of 10. Aura platform — TypeScript Express + React monorepo. Task 1 added pino logging. Now add request correlation IDs using AsyncLocalStorage so every log line for a request shares the same `requestId`.

## Global Constraints
- `npm install` ALWAYS requires `--legacy-peer-deps`
- Use `logger` from `server/lib/logger.ts` — never `console.log`
- TypeScript strict mode
- Tests run with `npm run test` (vitest)
- Working directory: `c:/Users/PC/Documents/projects/whatsapp-ai-agent-saas-platform`

## Files
- **Create:** `server/middleware/requestId.ts`
- **Modify:** `server.ts` — mount `requestIdMiddleware` as the very first middleware after `const app = express()`

## What to implement

### `server/middleware/requestId.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

const store = new AsyncLocalStorage<string>();

export function getRequestId(): string | undefined {
  return store.getStore();
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('x-request-id', id);
  store.run(id, next);
}
```

### `server.ts` — add import + mount
At the top of `server.ts`, add:
```typescript
import { requestIdMiddleware } from './server/middleware/requestId';
```

Mount as the FIRST middleware after `const app = express();`:
```typescript
app.use(requestIdMiddleware);
```

### Test to add in `tests/backend.test.ts`
```typescript
describe('requestId middleware', () => {
  it('sets X-Request-Id response header', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('X-Test-Auth-Bypass', 'true');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('echoes client-provided X-Request-Id', async () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const res = await request(app)
      .get('/api/health')
      .set('X-Request-Id', id)
      .set('X-Test-Auth-Bypass', 'true');
    expect(res.headers['x-request-id']).toBe(id);
  });
});
```

## TDD Order
1. Add tests → run → see fail (`x-request-id` header missing)
2. Create `server/middleware/requestId.ts`
3. Mount in `server.ts`
4. Run tests → both pass
5. Run full suite → all pass
6. Commit

## Commit message
```
feat: add request correlation ID middleware (AsyncLocalStorage)
```

## Report file
Write your full report to: `.superpowers/sdd/briefs/task-2-report.md`

## Report format
```
STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
COMMITS: <sha1> ...
TESTS: X passed, 0 failed
CONCERNS: (if any)
```
