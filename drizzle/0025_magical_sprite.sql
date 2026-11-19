CREATE TABLE "message_templates" (
	"key" text PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_templates_key" CHECK ("message_templates"."key" in ('fo1', 'fo2', 'fo3', 'olshop'))
);
--> statement-breakpoint
ALTER TABLE "message_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;