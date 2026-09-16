CREATE TYPE "public"."processing_stage" AS ENUM('PREPROCESS', 'OCR');--> statement-breakpoint
CREATE TYPE "public"."stage_status" AS ENUM('started', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "document_processing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"stage" "processing_stage" NOT NULL,
	"status" "stage_status" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"error_code" text,
	"error_message" text,
	"processor_version" text
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "preview_storage_key" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "searchable_pdf_storage_key" text;--> statement-breakpoint
ALTER TABLE "document_processing_events" ADD CONSTRAINT "document_processing_events_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_processing_events_document_id_idx" ON "document_processing_events" USING btree ("document_id");