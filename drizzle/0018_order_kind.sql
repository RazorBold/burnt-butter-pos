CREATE TYPE "public"."order_kind" AS ENUM('po', 'ready_stock', 'made_to_order');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "kind" "order_kind" DEFAULT 'po' NOT NULL;