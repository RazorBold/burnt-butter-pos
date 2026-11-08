ALTER TABLE "orders" ADD COLUMN "urgent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "urgent_by" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "urgent_note" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_urgent_by_profiles_id_fk" FOREIGN KEY ("urgent_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;