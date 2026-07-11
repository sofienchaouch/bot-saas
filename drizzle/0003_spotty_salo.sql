CREATE TABLE "team_members" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'support' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_members_tenant_idx" ON "team_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "team_members_uid_idx" ON "team_members" USING btree ("uid");