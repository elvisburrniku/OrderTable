
CREATE TABLE IF NOT EXISTS "combined_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"table_ids" text NOT NULL,
	"total_capacity" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"restaurant_id" integer,
	"tenant_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "combined_tables" ADD CONSTRAINT "combined_tables_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "combined_tables" ADD CONSTRAINT "combined_tables_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
