CREATE TYPE "public"."packaging_type" AS ENUM('normal', 'hampers');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "packaging_type" "packaging_type";--> statement-breakpoint
ALTER TABLE "packagings" ADD COLUMN "size" "menu_size";--> statement-breakpoint
ALTER TABLE "packagings" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Keputusan pemilik toko (Nov 2026): Stok Packaging hanya untuk box hampers. Packaging lama
-- diarsipkan (data dan riwayat tetap ada), lalu 8 box hampers dibuat dengan stok 0.
UPDATE "packagings" SET "is_active" = false;--> statement-breakpoint
INSERT INTO "packagings" ("name", "size", "unit", "stock", "created_at") VALUES
  ('Classic Red (Large)', 'large', 'pcs', 0, now()),
  ('Mac & Joy (Large)', 'large', 'pcs', 0, now() + interval '1 second'),
  ('Melted Cheese (Large)', 'large', 'pcs', 0, now() + interval '2 seconds'),
  ('Holy E Olio (Large)', 'large', 'pcs', 0, now() + interval '3 seconds'),
  ('Classic Red (Regular)', 'regular', 'pcs', 0, now() + interval '4 seconds'),
  ('Mac & Joy (Regular)', 'regular', 'pcs', 0, now() + interval '5 seconds'),
  ('Melted Cheese (Regular)', 'regular', 'pcs', 0, now() + interval '6 seconds'),
  ('Holy E Olio (Regular)', 'regular', 'pcs', 0, now() + interval '7 seconds')
ON CONFLICT ("name") DO NOTHING;
