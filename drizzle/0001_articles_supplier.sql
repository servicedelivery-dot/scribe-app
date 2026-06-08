ALTER TABLE "lms_user_profiles" ADD COLUMN "supplier_company" text;
--> statement-breakpoint
ALTER TABLE "lms_user_profiles" ADD COLUMN "onboarding_complete" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE "lms_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"emoji" text DEFAULT '📄' NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"estimated_read_mins" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
