CREATE TABLE "order_deletions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_no" text NOT NULL,
	"customer_name" text NOT NULL,
	"type" "order_type" NOT NULL,
	"status" "order_status" NOT NULL,
	"total" integer NOT NULL,
	"delivery_date" date,
	"reason" text,
	"deleted_by" uuid,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_deletions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_deletions" ADD CONSTRAINT "order_deletions_deleted_by_profiles_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_deletions_deleted_at_idx" ON "order_deletions" USING btree ("deleted_at");