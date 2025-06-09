CREATE TABLE "booking_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"restaurant_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"requested_date" timestamp,
	"requested_time" text,
	"requested_guest_count" integer,
	"requested_table_id" integer,
	"request_notes" text,
	"status" varchar(20) DEFAULT 'pending',
	"restaurant_response" text,
	"created_at" timestamp DEFAULT now(),
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"booking_id" integer,
	"change_request_id" integer,
	"data" json,
	"original_data" json,
	"is_read" boolean DEFAULT false,
	"is_reverted" boolean DEFAULT false,
	"can_revert" boolean DEFAULT false,
	"reverted_by" text,
	"reverted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "management_hash" text;--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "qr_code" text;--> statement-breakpoint
ALTER TABLE "booking_change_requests" ADD CONSTRAINT "booking_change_requests_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_change_requests" ADD CONSTRAINT "booking_change_requests_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_change_requests" ADD CONSTRAINT "booking_change_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_change_requests" ADD CONSTRAINT "booking_change_requests_requested_table_id_tables_id_fk" FOREIGN KEY ("requested_table_id") REFERENCES "public"."tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_change_request_id_booking_change_requests_id_fk" FOREIGN KEY ("change_request_id") REFERENCES "public"."booking_change_requests"("id") ON DELETE no action ON UPDATE no action;