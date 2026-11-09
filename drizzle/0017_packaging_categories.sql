CREATE TABLE "packaging_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packaging_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "packaging_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "packagings" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "packagings" ADD CONSTRAINT "packagings_category_id_packaging_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."packaging_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Kategori stok awal dari pengelompokan lama (size), lalu tiap packaging ditautkan.
INSERT INTO "packaging_categories" ("name", "sort_order") VALUES
  ('Size Large', 0),
  ('Size Regular', 1)
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "packagings" p SET "category_id" = c."id"
FROM "packaging_categories" c
WHERE (p."size" = 'large' AND c."name" = 'Size Large')
   OR (p."size" = 'regular' AND c."name" = 'Size Regular');
