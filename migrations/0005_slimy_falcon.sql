CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"event" text NOT NULL,
	"url" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "integration_configurations" DROP CONSTRAINT "integration_configurations_restaurant_id_integration_id_unique";--> statement-breakpoint
ALTER TABLE "integration_configurations" DROP CONSTRAINT "integration_configurations_restaurant_id_restaurants_id_fk";
--> statement-breakpoint
ALTER TABLE "integration_configurations" DROP CONSTRAINT "integration_configurations_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "integration_configurations" ALTER COLUMN "integration_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "integration_configurations" ALTER COLUMN "is_enabled" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_configurations" ALTER COLUMN "configuration" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_configurations" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_configurations" ADD CONSTRAINT "integration_configurations_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_configurations" ADD CONSTRAINT "integration_configurations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;