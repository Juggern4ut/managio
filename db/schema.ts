import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import {
  documentTypeValues,
  processingStatusValues,
  reviewStatusValues,
} from '../shared/schemas/document'

export const documentTypeEnum = pgEnum('document_type', documentTypeValues)
export const processingStatusEnum = pgEnum('processing_status', processingStatusValues)
export const reviewStatusEnum = pgEnum('review_status', reviewStatusValues)

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    storageKey: text('storage_key').notNull(),
    sha256: text('sha256').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
    documentDate: timestamp('document_date', { withTimezone: true, mode: 'date' }),
    documentType: documentTypeEnum('document_type').notNull().default('unknown'),
    processingStatus: processingStatusEnum('processing_status').notNull().default('UPLOADED'),
    ocrText: text('ocr_text'),
    reviewStatus: reviewStatusEnum('review_status').notNull().default('not_required'),
    createdBy: text('created_by'),
    modelVersion: text('model_version'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [index('documents_sha256_idx').on(table.sha256)],
)
