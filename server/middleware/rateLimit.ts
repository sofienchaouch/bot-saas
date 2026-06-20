import rateLimit from "express-rate-limit";
import { logger } from "../lib/logger";
import { NODE_ENV } from "../config";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Limit webhook endpoints to 200 requests per minute
  message: { error: "Too many requests to webhook" },
  standardHeaders: true,
  legacyHeaders: false,
});

const TENANT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const TENANT_MAX_REQUESTS = 500;

interface TenantBucket {
  count: number;
  resetAt: number;
}

const tenantBuckets = new Map<string, TenantBucket>();

export function tenantRateLimiter(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
): void {
  // Skip in test mode
  if (NODE_ENV === "test") {
    return next();
  }

  const tenantId = req.params.id;
  if (!tenantId) {
    return next();
  }

  const now = Date.now();
  let bucket = tenantBuckets.get(tenantId);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + TENANT_WINDOW_MS };
    tenantBuckets.set(tenantId, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, TENANT_MAX_REQUESTS - bucket.count);
  const resetSec = Math.ceil((bucket.resetAt - now) / 1000);

  res.setHeader("X-RateLimit-Limit", TENANT_MAX_REQUESTS);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", resetSec);

  if (bucket.count > TENANT_MAX_REQUESTS) {
    logger.warn({ tenantId, count: bucket.count }, "Tenant rate limit exceeded");
    res.status(429).json({
      error: "Too many requests for this tenant",
      retryAfter: resetSec,
    });
    return;
  }

  next();
}
