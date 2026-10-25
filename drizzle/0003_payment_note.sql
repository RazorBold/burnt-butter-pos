DROP INDEX "payments_order_idx";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "recorded_by" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_profiles_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");