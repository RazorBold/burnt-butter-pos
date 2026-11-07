ALTER TYPE "public"."order_status" ADD VALUE 'siap_packing' BEFORE 'siap_kirim';--> statement-breakpoint
CREATE TABLE "menu_variant_packagings" (
	"menu_variant_id" uuid NOT NULL,
	"packaging_id" uuid NOT NULL,
	"qty" integer NOT NULL,
	CONSTRAINT "menu_variant_packagings_menu_variant_id_packaging_id_pk" PRIMARY KEY("menu_variant_id","packaging_id"),
	CONSTRAINT "menu_variant_packagings_qty_positive" CHECK ("menu_variant_packagings"."qty" > 0)
);
--> statement-breakpoint
ALTER TABLE "menu_variant_packagings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "packagings" ADD COLUMN "per_order_qty" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_variant_packagings" ADD CONSTRAINT "menu_variant_packagings_menu_variant_id_menu_variants_id_fk" FOREIGN KEY ("menu_variant_id") REFERENCES "public"."menu_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_variant_packagings" ADD CONSTRAINT "menu_variant_packagings_packaging_id_packagings_id_fk" FOREIGN KEY ("packaging_id") REFERENCES "public"."packagings"("id") ON DELETE cascade ON UPDATE no action;