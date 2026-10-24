ALTER TABLE "shipments" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sender_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "card_to" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "card_wishes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "card_from" text;