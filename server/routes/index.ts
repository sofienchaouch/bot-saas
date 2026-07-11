import express from "express";
import adminRouter from "./admin";
import webhooksRouter from "./webhooks";
import integrationsRouter from "./integrations";
import billingRouter from "./billing";

const router = express.Router();

router.use("/", adminRouter);
router.use("/", webhooksRouter);
router.use("/", integrationsRouter);
router.use("/", billingRouter);

// Test route to trigger the global error handler in test environment
router.get("/api/test-error", (req, res) => {
  throw new Error("Test Route Exception");
});

export default router;
