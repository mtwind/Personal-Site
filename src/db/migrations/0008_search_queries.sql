CREATE TABLE "search_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"answer" text,
	"ip_hash" text NOT NULL,
	"outcome" text DEFAULT 'ok' NOT NULL,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"cached_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "search_queries_ip_created_idx" ON "search_queries" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "search_queries_created_idx" ON "search_queries" USING btree ("created_at");