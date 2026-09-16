CREATE TYPE "public"."extracted_field_type" AS ENUM('document_date', 'due_date', 'amount', 'invoice_number', 'coupon_code', 'coupon_expiration', 'company');--> statement-breakpoint
ALTER TYPE "public"."processing_stage" ADD VALUE 'EXTRACT';--> statement-breakpoint
CREATE TABLE "document_extracted_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"field_type" "extracted_field_type" NOT NULL,
	"raw_text" text NOT NULL,
	"normalized_text" text,
	"amount_minor_units" integer,
	"currency" text,
	"company_id" uuid,
	"confidence" numeric(3, 2) NOT NULL,
	"extraction_method" text NOT NULL,
	"source_snippet" text NOT NULL,
	"processor_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_extracted_fields" ADD CONSTRAINT "document_extracted_fields_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extracted_fields" ADD CONSTRAINT "document_extracted_fields_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_extracted_fields_document_id_idx" ON "document_extracted_fields" USING btree ("document_id");