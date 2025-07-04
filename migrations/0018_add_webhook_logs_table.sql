
CREATE TABLE IF NOT EXISTS "webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"restaurant_id" integer,
	"webhook_id" integer,
	"event_type" varchar(100) NOT NULL,
	"source" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"http_method" varchar(10) DEFAULT 'POST',
	"request_url" text,
	"request_headers" jsonb DEFAULT '{}',
	"request_body" jsonb DEFAULT '{}',
	"response_status" integer,
	"response_body" jsonb DEFAULT '{}',
	"processing_time" integer,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
