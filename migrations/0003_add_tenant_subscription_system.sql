ALTER TABLE "sms_messages" ALTER COLUMN "booking_date_from" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sms_messages" ALTER COLUMN "booking_date_to" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "special_periods" ALTER COLUMN "start_date" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "special_periods" ALTER COLUMN "end_date" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "time_slots" ALTER COLUMN "date" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "waiting_list" ALTER COLUMN "requested_date" SET DATA TYPE text;--> statement-breakpoint

ALTER TABLE "subscription_plans" ADD COLUMN "max_restaurants" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "trial_days" integer DEFAULT 14;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_plan_id" integer;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_status" varchar(20) DEFAULT 'trial';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "trial_start_date" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "trial_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "max_restaurants" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_subscription_plan_id_subscription_plans_id_fk" FOREIGN KEY ("subscription_plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;