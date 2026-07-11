ALTER TABLE "tenants" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_tier" text DEFAULT 'Free' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "message_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "autopilot_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "telegram_bot_token_enc" text;--> statement-breakpoint
CREATE INDEX "tenants_owner_idx" ON "tenants" USING btree ("owner_id");