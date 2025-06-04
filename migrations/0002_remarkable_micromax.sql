CREATE TABLE "combined_tables" (
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
--> statement-breakpoint
ALTER TABLE "tables" ALTER COLUMN "restaurant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tables" ALTER COLUMN "tenant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tables" ALTER COLUMN "table_number" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "room_id" integer;--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "combined_tables" ADD CONSTRAINT "combined_tables_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combined_tables" ADD CONSTRAINT "combined_tables_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;