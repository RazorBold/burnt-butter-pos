-- Tipe pesanan Personal/Hadiah diganti Normal/Hampers/Normal & Hampers (Nov 2026).
-- Database produksi sudah diubah langsung sebelum migrasi ini dibuat, jadi blok ini hanya
-- bekerja bila tipe lama masih ada (database lain): personal -> normal, hadiah -> hampers.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'order_type' AND e.enumlabel IN ('personal', 'hadiah')
  ) THEN
    ALTER TABLE "orders" ALTER COLUMN "type" SET DATA TYPE text;
    UPDATE "orders" SET "type" = CASE "type"
      WHEN 'personal' THEN 'normal'
      WHEN 'hadiah' THEN 'hampers'
      ELSE "type" END;
    DROP TYPE "public"."order_type";
    CREATE TYPE "public"."order_type" AS ENUM('normal', 'hampers', 'normal_hampers');
    ALTER TABLE "orders" ALTER COLUMN "type" SET DATA TYPE "public"."order_type"
      USING "type"::"public"."order_type";
  END IF;
END $$;
