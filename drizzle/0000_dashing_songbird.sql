CREATE TABLE "agents" (
	"id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'Support' NOT NULL,
	"tone" text DEFAULT 'professional' NOT NULL,
	"system_instruction" text DEFAULT '' NOT NULL,
	"avatar" text DEFAULT '🤖' NOT NULL,
	"is_custom" boolean DEFAULT false,
	"voice_enabled" boolean DEFAULT false,
	CONSTRAINT "agents_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"type" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now(),
	"channel" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_name" text DEFAULT '' NOT NULL,
	"customer_phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"notes" text,
	"synced_with_google" boolean DEFAULT false,
	"google_event_id" text,
	CONSTRAINT "appointments_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"key" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kb_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector(768)
);
--> statement-breakpoint
CREATE TABLE "kb_documents" (
	"id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"type" text DEFAULT 'document' NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"date_added" timestamp with time zone DEFAULT now(),
	"file_type" text,
	"file_size" text,
	"url" text,
	"crawl_depth" integer,
	"crawl_status" text,
	"crawl_pages_count" integer,
	"social_network" text,
	CONSTRAINT "kb_documents_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'New' NOT NULL,
	"date_captured" timestamp with time zone DEFAULT now(),
	"note" text,
	CONSTRAINT "leads_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"industry" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"avatar" text DEFAULT '🤖' NOT NULL,
	"bot_name" text DEFAULT 'Aura' NOT NULL,
	"tone" text DEFAULT 'professional' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"system_instruction" text,
	"active_welcome_template_id" text,
	"whatsapp_phone_number" text,
	"whatsapp_verified_sid" text,
	"whatsapp_status" text DEFAULT 'disconnected',
	"whatsapp_api_key_enc" text,
	"whatsapp_sandbox_active" boolean DEFAULT false,
	"whatsapp_sandbox_numbers" jsonb DEFAULT '[]'::jsonb,
	"whatsapp_test_mode" boolean DEFAULT false,
	"messenger_page_id" text,
	"messenger_token_enc" text,
	"messenger_status" text DEFAULT 'disconnected',
	"messenger_sandbox_active" boolean DEFAULT false,
	"messenger_sandbox_numbers" jsonb DEFAULT '[]'::jsonb,
	"messenger_voice_enabled" boolean DEFAULT false,
	"active_agent_id" text,
	"google_calendar_auto_schedule" boolean DEFAULT false,
	"twilio_voice_active" boolean DEFAULT false,
	"twilio_voice_name" text,
	"crawl_schedule" text DEFAULT 'none',
	"last_crawl_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now(),
	"channel" text NOT NULL,
	"direction" text NOT NULL,
	"status" text NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"sender_phone" text,
	"message_preview" text
);
--> statement-breakpoint
CREATE TABLE "welcome_templates" (
	"id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "welcome_templates_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_chunks" ADD CONSTRAINT "kb_chunks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_documents" ADD CONSTRAINT "kb_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welcome_templates" ADD CONSTRAINT "welcome_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_tenant_ts_idx" ON "analytics_events" USING btree ("tenant_id","timestamp");--> statement-breakpoint
CREATE INDEX "conversations_tenant_idx" ON "conversations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "kb_chunks_tenant_idx" ON "kb_chunks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "webhook_events_tenant_ts_idx" ON "webhook_events" USING btree ("tenant_id","timestamp");