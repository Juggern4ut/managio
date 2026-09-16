import { sql } from 'drizzle-orm'
import { bigint, foreignKey, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import {
  documentTypeValues,
  processingStageValues,
  processingStatusValues,
  reviewStatusValues,
  stageStatusValues,
} from '../shared/schemas/document'

export const documentTypeEnum = pgEnum('document_type', documentTypeValues)
export const processingStatusEnum = pgEnum('processing_status', processingStatusValues)
export const reviewStatusEnum = pgEnum('review_status', reviewStatusValues)
export const processingStageEnum = pgEnum('processing_stage', processingStageValues)
export const stageStatusEnum = pgEnum('stage_status', stageStatusValues)

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    storageKey: text('storage_key').notNull(),
    sha256: text('sha256').notNull(),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
    documentDate: timestamp('document_date', { withTimezone: true, mode: 'date' }),
    documentType: documentTypeEnum('document_type').notNull().default('unknown'),
    processingStatus: processingStatusEnum('processing_status').notNull().default('UPLOADED'),
    ocrText: text('ocr_text'),
    // Derived artifacts. Nullable: they only exist once PREPROCESS/OCR succeed,
    // and the original file above is never overwritten by them.
    previewStorageKey: text('preview_storage_key'),
    searchablePdfStorageKey: text('searchable_pdf_storage_key'),
    reviewStatus: reviewStatusEnum('review_status').notNull().default('not_required'),
    createdBy: text('created_by'),
    modelVersion: text('model_version'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  table => [uniqueIndex('documents_sha256_idx').on(table.sha256)],
)

export const documentProcessingEvents = pgTable(
  'document_processing_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').notNull(),
    stage: processingStageEnum('stage').notNull(),
    status: stageStatusEnum('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    errorCode: text('error_code'),
    // Safe diagnostic message only — never raw OCR text or document content.
    errorMessage: text('error_message'),
    processorVersion: text('processor_version'),
  },
  table => [
    index('document_processing_events_document_id_idx').on(table.documentId),
    foreignKey({
      columns: [table.documentId],
      foreignColumns: [documents.id],
      name: 'document_processing_events_document_id_fk',
    }).onDelete('cascade'),
  ],
)
