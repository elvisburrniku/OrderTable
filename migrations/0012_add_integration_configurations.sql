
CREATE TABLE IF NOT EXISTS "integration_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"restaurant_id" integer NOT NULL,
	"integration_id" varchar(255) NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"configuration" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "integration_configurations_tenant_id_restaurant_id_integration_id_unique" UNIQUE("tenant_id","restaurant_id","integration_id")
);

DO $$ BEGIN
 ALTER TABLE "integration_configurations" ADD CONSTRAINT "integration_configurations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "integration_configurations" ADD CONSTRAINT "integration_configurations_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
