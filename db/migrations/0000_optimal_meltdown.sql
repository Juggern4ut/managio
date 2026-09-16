CREATE TYPE "public"."document_type" AS ENUM('unknown', 'letter', 'invoice', 'receipt', 'contract', 'insurance_document', 'coupon', 'other');--> statement-breakpoint
CREATE TYPE "public"."processing_status" AS ENUM('UPLOADED', 'VALIDATED', 'PREPROCESSED', 'OCR_COMPLETED', 'CLASSIFIED', 'EXTRACTED', 'RELATIONS_DETECTED', 'INDEXED', 'COMPLETE', 'FAILED_RETRYABLE', 'FAILED_PERMANENT', 'NEEDS_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('not_required', 'pending', 'approved');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"sha256" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document_date" timestamp with time zone,
	"document_type" "document_type" DEFAULT 'unknown' NOT NULL,
	"processing_status" "processing_status" DEFAULT 'UPLOADED' NOT NULL,
	"ocr_text" text,
	"review_status" "review_status" DEFAULT 'not_required' NOT NULL,
	"created_by" text,
	"model_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "documents_sha256_idx" ON "documents" USING btree ("sha256");