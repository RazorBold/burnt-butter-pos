CREATE TABLE "chat_mentions" (
	"message_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	CONSTRAINT "chat_mentions_message_id_profile_id_pk" PRIMARY KEY("message_id","profile_id")
);
--> statement-breakpoint
ALTER TABLE "chat_mentions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"mentions_all" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chat_reads" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_reads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_mentions" ADD CONSTRAINT "chat_mentions_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_mentions" ADD CONSTRAINT "chat_mentions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_reads" ADD CONSTRAINT "chat_reads_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_mentions_profile_idx" ON "chat_mentions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "chat_messages_created_idx" ON "chat_messages" USING btree ("created_at");