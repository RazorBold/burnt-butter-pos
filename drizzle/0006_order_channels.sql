CREATE TYPE "public"."order_channel" AS ENUM('whatsapp', 'shopee', 'tokopedia');--> statement-breakpoint
ALTER TYPE "public"."payment_method_type" ADD VALUE 'marketplace';--> statement-breakpoint
ALTER TYPE "public"."shipping_method" ADD VALUE 'ekspedisi';--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "channel" "order_channel" DEFAULT 'whatsapp' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "marketplace_order_no" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "expedition" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "tracking_no" text;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_marketplace_no_idx" ON "orders" USING btree ("channel","marketplace_order_no");