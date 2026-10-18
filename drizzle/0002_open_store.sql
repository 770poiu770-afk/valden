ALTER TABLE "companies" ALTER COLUMN "business_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "business_phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "account_type" text DEFAULT 'BUSINESS' NOT NULL;