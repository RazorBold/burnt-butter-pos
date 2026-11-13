CREATE TABLE "shipping_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"flow" "shipping_method" NOT NULL,
	"live_tracking" boolean DEFAULT false NOT NULL,
	"note" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_options_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "shipping_options" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "option_id" uuid;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_option_id_shipping_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."shipping_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "shipping_options" ("name", "flow", "live_tracking", "note", "sort_order") VALUES
  ('Pick Up', 'pick_up', false, 'Customer mengambil sendiri di toko.', 1),
  ('Instant', 'instant', true, 'Diantar ojek online (GoSend, GrabExpress).', 2),
  ('Kurir Internal', 'kurir_internal', true, 'Kurir Burnt Butter, jam 09.00–17.00 mengikuti rute kurir.', 3),
  ('Ekspedisi', 'ekspedisi', false, 'Dikirim lewat ekspedisi marketplace; cukup tandai sudah dikirim.', 4)
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "shipments" s SET "option_id" = o."id" FROM "shipping_options" o WHERE o."flow" = s."method" AND s."option_id" IS NULL;
