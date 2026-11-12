ALTER TABLE "menu_variants" ADD COLUMN IF NOT EXISTS "loyang_qty" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_variants" ADD COLUMN IF NOT EXISTS "loyang_size" "menu_size";