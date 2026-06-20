import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

// Asynchronous route handler wrapper to catch unhandled promise rejections
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Global Express error handling middleware
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
