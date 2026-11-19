ALTER TABLE "menus" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Isi awal: urutan sekarang (urutan dibuat), supaya template dan form tidak berubah.
UPDATE "menus" SET "sort_order" = ranked.rn FROM (SELECT "id", row_number() OVER (ORDER BY "created_at", "name") AS rn FROM "menus") AS ranked WHERE "menus"."id" = ranked."id";
