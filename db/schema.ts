import { sql } from 'drizzle-orm'
import {
  bigint,
  customType,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
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

// Postgres full-text search vector. No dedicated Drizzle column type exists
// for this, hence the customType.
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    address: text('address'),
    website: text('website'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [uniqueIndex('companies_normalized_name_idx').on(table.normalizedName)],
)

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [uniqueIndex('categories_normalized_name_idx').on(table.normalizedName)],
)

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [uniqueIndex('tags_normalized_name_idx').on(table.normalizedName)],
)

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
    // 'pending' until a human assigns type/company/category or explicitly
    // marks it reviewed — that's what the Inbox filters on. 'not_required'
    // is reserved for a future high-confidence AI auto-accept path.
    reviewStatus: reviewStatusEnum('review_status').notNull().default('pending'),
    companyId: uuid('company_id'),
    categoryId: uuid('category_id'),
    createdBy: text('created_by'),
    modelVersion: text('model_version'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
    // 'simple' (no stemming): OCR text is multilingual (German/French/
    // Italian/English), and a single-language stemmer would mismatch most
    // of it. Filename is weighted above OCR text.
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`setweight(to_tsvector('simple', coalesce("original_filename", '')), 'A') || setweight(to_tsvector('simple', coalesce("ocr_text", '')), 'B')`,
    ),
  },
  table => [
    uniqueIndex('documents_sha256_idx').on(table.sha256),
    index('documents_search_vector_idx').using('gin', table.searchVector),
    index('documents_review_status_idx').on(table.reviewStatus),
    foreignKey({
      columns: [table.companyId],
      foreignColumns: [companies.id],
      name: 'documents_company_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'documents_category_id_fk',
    }).onDelete('set null'),
  ],
)

export const documentTags = pgTable(
  'document_tags',
  {
    documentId: uuid('document_id').notNull(),
    tagId: uuid('tag_id').notNull(),
  },
  table => [
    primaryKey({ columns: [table.documentId, table.tagId] }),
    foreignKey({
      columns: [table.documentId],
      foreignColumns: [documents.id],
      name: 'document_tags_document_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.tagId],
      foreignColumns: [tags.id],
      name: 'document_tags_tag_id_fk',
    }).onDelete('cascade'),
  ],
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
