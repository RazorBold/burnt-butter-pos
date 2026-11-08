CREATE TABLE "menu_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sized" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "menu_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Kategori awal dari enum lama (urutan = urutan template WA), lalu tiap menu ditautkan.
INSERT INTO "menu_categories" ("name", "sized", "sort_order") VALUES
  ('Pasta', true, 0),
  ('Dessert', false, 1),
  ('Special Bundle', false, 2)
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "menus" m SET "category_id" = c."id"
FROM "menu_categories" c
WHERE c."name" = CASE m."category"
  WHEN 'pasta' THEN 'Pasta'
  WHEN 'dessert' THEN 'Dessert'
  WHEN 'bundle' THEN 'Special Bundle'
END;
