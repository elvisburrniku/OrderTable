CREATE TABLE "floor_plan_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"elements" jsonb DEFAULT '[]' NOT NULL,
	"dimensions" jsonb DEFAULT '{"width": 800, "height": 600}' NOT NULL,
	"grid_size" integer DEFAULT 20,
	"preview_image" text,
	"tags" text[],
	"popularity" integer DEFAULT 0,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floor_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"elements" jsonb DEFAULT '[]' NOT NULL,
	"dimensions" jsonb DEFAULT '{"width": 800, "height": 600}' NOT NULL,
	"grid_size" integer DEFAULT 20,
	"scale" numeric(3, 2) DEFAULT '1.00',
	"is_active" boolean DEFAULT false,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "restaurants" ALTER COLUMN "tenant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "event_type" varchar(50) DEFAULT 'general';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "internal_notes" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "extra_description" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "language" varchar(10) DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "requires_payment" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_deadline_hours" integer DEFAULT 24;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_status" varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "redirect" text DEFAULT 'dashboard';--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;