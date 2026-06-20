import express from "express";
import adminRouter from "./admin";
import webhooksRouter from "./webhooks";
import integrationsRouter from "./integrations";

const router = express.Router();

router.use("/", adminRouter);
router.use("/", webhooksRouter);
router.use("/", integrationsRouter);

export default router;
