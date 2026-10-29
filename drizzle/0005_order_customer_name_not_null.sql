-- Isi pesanan yang dibuat kode lama di sela deploy, lalu wajibkan kolomnya.
UPDATE "orders" SET "customer_name" = "customers"."name" FROM "customers" WHERE "customers"."id" = "orders"."customer_id" AND "orders"."customer_name" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "customer_name" SET NOT NULL;
