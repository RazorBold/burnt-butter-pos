CREATE TYPE "public"."order_edit_part" AS ENUM('data', 'menu', 'catatan');--> statement-breakpoint
CREATE TABLE "order_edit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"part" "order_edit_part" NOT NULL,
	"changes" text[] NOT NULL,
	"edited_by" uuid,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_edit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_edit_logs" ADD CONSTRAINT "order_edit_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_edit_logs" ADD CONSTRAINT "order_edit_logs_edited_by_profiles_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_edit_logs_order_idx" ON "order_edit_logs" USING btree ("order_id","edited_at");