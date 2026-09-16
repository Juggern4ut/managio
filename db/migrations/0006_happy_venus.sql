CREATE TABLE "document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "type_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "document_types_normalized_name_idx" ON "document_types" USING btree ("normalized_name");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."document_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Seed document types from the old fixed enum values, each with a distinct
-- default color. 'unknown' is intentionally not seeded — it becomes a NULL
-- type_id (no type assigned) below, matching how every other optional
-- classification in this schema (company, category) already works.
INSERT INTO "document_types" ("name", "normalized_name", "color") VALUES
	('Letter', 'letter', '#64748b'),
	('Invoice', 'invoice', '#2563eb'),
	('Receipt', 'receipt', '#16a34a'),
	('Contract', 'contract', '#7c3aed'),
	('Insurance Document', 'insurance document', '#db2777'),
	('Coupon', 'coupon', '#f59e0b'),
	('Other', 'other', '#6b7280');--> statement-breakpoint
UPDATE "documents" SET "type_id" = "document_types"."id"
FROM "document_types"
WHERE
	("documents"."document_type" = 'letter' AND "document_types"."normalized_name" = 'letter') OR
	("documents"."document_type" = 'invoice' AND "document_types"."normalized_name" = 'invoice') OR
	("documents"."document_type" = 'receipt' AND "document_types"."normalized_name" = 'receipt') OR
	("documents"."document_type" = 'contract' AND "document_types"."normalized_name" = 'contract') OR
	("documents"."document_type" = 'insurance_document' AND "document_types"."normalized_name" = 'insurance document') OR
	("documents"."document_type" = 'coupon' AND "document_types"."normalized_name" = 'coupon') OR
	("documents"."document_type" = 'other' AND "document_types"."normalized_name" = 'other');