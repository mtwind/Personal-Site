CREATE TABLE "ad_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"slot" text NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand" text NOT NULL,
	"headline" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"display_url" text DEFAULT '' NOT NULL,
	"target_url" text NOT NULL,
	"icon_slug" text,
	"color" text,
	"icon_url" text,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"slots" jsonb DEFAULT '["sponsored","rail","banner"]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_events_ad_kind_idx" ON "ad_events" USING btree ("ad_id","kind");--> statement-breakpoint
CREATE INDEX "ad_events_ip_created_idx" ON "ad_events" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "ads_active_sort_idx" ON "ads" USING btree ("active","sort_order");