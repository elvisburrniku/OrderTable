
CREATE TABLE IF NOT EXISTS "invitation_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"tenant_id" integer NOT NULL,
	"role" varchar(50) NOT NULL,
	"invited_by_user_id" integer,
	"used" boolean DEFAULT false,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invitation_tokens_token_unique" UNIQUE("token")
);

DO $$ BEGIN
 ALTER TABLE "invitation_tokens" ADD CONSTRAINT "invitation_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "invitation_tokens" ADD CONSTRAINT "invitation_tokens_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
