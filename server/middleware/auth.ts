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
