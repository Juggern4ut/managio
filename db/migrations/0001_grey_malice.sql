DROP INDEX "documents_sha256_idx";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "file_size_bytes" bigint NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_sha256_idx" ON "documents" USING btree ("sha256");