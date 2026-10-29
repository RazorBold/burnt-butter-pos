-- Nama customer disimpan per pesanan supaya pesanan lama tidak ikut berganti nama saat
-- no. HP yang sama dipakai dengan nama lain. Pesanan yang sudah ada diisi nama customer saat ini.
-- NOT NULL dipasang di 0005, setelah kode yang mengisi kolom ini ter-deploy.
ALTER TABLE "orders" ADD COLUMN "customer_name" text;--> statement-breakpoint
UPDATE "orders" SET "customer_name" = "customers"."name" FROM "customers" WHERE "customers"."id" = "orders"."customer_id";
