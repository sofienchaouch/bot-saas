import express from "express";
import admin from "firebase-admin";
import { NODE_ENV, BYPASS_AUTH_IN_DEV } from "../config";
import { logger } from "../lib/logger";

// Public routes that bypass authentication
const PUBLIC_PATHS = [
  "/api/health",
  "/api/chat",
  "/api/twilio/",
  "/api/widget/",
];

function isPublicPath(path: string): boolean {
  if (path.startsWith("/api/webhook")) return true;
  if (path.match(/^\/api\/tenant\/[^/]+\/appointment$/)) return true;
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p));
}

export async function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Skip auth for public routes
  if (isPublicPath(req.path)) {
    return next();
  }

  // Only bypass in test mode with explicit header
  if (NODE_ENV === "test" && req.headers["x-test-auth-bypass"] === "true") {
    return next();
  }

  // Allow dev bypass when explicitly opted in via BYPASS_AUTH_IN_DEV=true in .env
  if (NODE_ENV === "development" && BYPASS_AUTH_IN_DEV === "true") {
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
