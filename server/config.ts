import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import { promisify } from "util";

dotenv.config();

const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  ENCRYPTION_KEY: z.string().default("aura_platform_encryption_master_key_2026"),
  WHATSAPP_VERIFY_TOKEN: z.string().default("aura_platform_verify_token_2026"),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.string().default("development"),
  APP_URL: z.string().optional()
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error("❌ Environment validation failed:", parsedEnv.error.format());
  process.exit(1);
}

if (parsedEnv.data.NODE_ENV === "production" && parsedEnv.data.ENCRYPTION_KEY === "aura_platform_encryption_master_key_2026") {
  console.error("❌ Security blockade: Default ENCRYPTION_KEY is not permitted in production environment!");
  process.exit(1);
}

export const { ENCRYPTION_KEY, WHATSAPP_VERIFY_TOKEN, PORT, NODE_ENV, APP_URL, GEMINI_API_KEY } = parsedEnv.data;
export const lookupAsync = promisify(dns.lookup);

export const TENANTS_FILE = NODE_ENV === "test"
  ? path.join(process.cwd(), "tenants_store.test.json")
  : path.join(process.cwd(), "tenants_store.json");
export const CONVERSATIONS_FILE = NODE_ENV === "test"
  ? path.join(process.cwd(), "webhook_conversations.test.json")
  : path.join(process.cwd(), "webhook_conversations.json");
