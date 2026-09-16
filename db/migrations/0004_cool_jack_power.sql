CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed_amount', 'other');--> statement-breakpoint
CREATE TYPE "public"."relation_type" AS ENUM('related_to', 'duplicate_of', 'part_of_case', 'supports_purchase', 'proves_warranty');--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_document_id" uuid,
	"issuer_company_id" uuid,
	"code" text,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"currency" text,
	"valid_from" date,
	"expires_on" date,
	"minimum_purchase_minor_units" integer,
	"conditions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_document_id" uuid NOT NULL,
	"target_document_id" uuid NOT NULL,
	"relation_type" "relation_type" NOT NULL,
	"confidence" numeric(3, 2),
	"confirmed_by_user" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_relations_no_self_reference" CHECK ("document_relations"."source_document_id" <> "document_relations"."target_document_id")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid,
	"document_id" uuid,
	"category_id" uuid,
	"amount_minor_units" integer NOT NULL,
	"currency" text NOT NULL,
	"expense_date" date NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"serial_number" text,
	"model_number" text,
	"manufacturer" text,
	"purchase_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 3) DEFAULT 1 NOT NULL,
	"unit_price_minor_units" integer NOT NULL,
	"total_minor_units" integer NOT NULL,
	"product_id" uuid
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"merchant_company_id" uuid,
	"purchase_date" date NOT NULL,
	"total_minor_units" integer NOT NULL,
	"currency" text NOT NULL,
	"tax_minor_units" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warranties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"source_document_id" uuid,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"warranty_type" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_source_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_issuer_company_id_fk" FOREIGN KEY ("issuer_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_source_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_target_document_id_fk" FOREIGN KEY ("target_document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_receipt_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_merchant_company_id_fk" FOREIGN KEY ("merchant_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_source_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_relations_unique_idx" ON "document_relations" USING btree ("source_document_id","target_document_id","relation_type");--> statement-breakpoint
CREATE INDEX "document_relations_target_document_id_idx" ON "document_relations" USING btree ("target_document_id");--> statement-breakpoint
CREATE INDEX "receipt_items_receipt_id_idx" ON "receipt_items" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "warranties_product_id_idx" ON "warranties" USING btree ("product_id");