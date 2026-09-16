import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  numeric,
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
import { discountTypeValues } from '../shared/schemas/coupon'
import { relationTypeValues } from '../shared/schemas/relation'

export const documentTypeEnum = pgEnum('document_type', documentTypeValues)
export const processingStatusEnum = pgEnum('processing_status', processingStatusValues)
export const reviewStatusEnum = pgEnum('review_status', reviewStatusValues)
export const processingStageEnum = pgEnum('processing_stage', processingStageValues)
export const stageStatusEnum = pgEnum('stage_status', stageStatusValues)
export const discountTypeEnum = pgEnum('discount_type', discountTypeValues)
export const relationTypeEnum = pgEnum('relation_type', relationTypeValues)

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

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  serialNumber: text('serial_number'),
  modelNumber: text('model_number'),
  manufacturer: text('manufacturer'),
  purchaseDate: date('purchase_date', { mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const receipts = pgTable(
  'receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id'),
    merchantCompanyId: uuid('merchant_company_id'),
    purchaseDate: date('purchase_date', { mode: 'date' }).notNull(),
    totalMinorUnits: integer('total_minor_units').notNull(),
    currency: text('currency').notNull(),
    taxMinorUnits: integer('tax_minor_units'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.documentId],
      foreignColumns: [documents.id],
      name: 'receipts_document_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.merchantCompanyId],
      foreignColumns: [companies.id],
      name: 'receipts_merchant_company_id_fk',
    }).onDelete('set null'),
  ],
)

export const receiptItems = pgTable(
  'receipt_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    receiptId: uuid('receipt_id').notNull(),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 3, mode: 'number' }).notNull().default(1),
    unitPriceMinorUnits: integer('unit_price_minor_units').notNull(),
    totalMinorUnits: integer('total_minor_units').notNull(),
    productId: uuid('product_id'),
  },
  table => [
    index('receipt_items_receipt_id_idx').on(table.receiptId),
    foreignKey({
      columns: [table.receiptId],
      foreignColumns: [receipts.id],
      name: 'receipt_items_receipt_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'receipt_items_product_id_fk',
    }).onDelete('set null'),
  ],
)

export const warranties = pgTable(
  'warranties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull(),
    sourceDocumentId: uuid('source_document_id'),
    startsOn: date('starts_on', { mode: 'date' }).notNull(),
    endsOn: date('ends_on', { mode: 'date' }).notNull(),
    warrantyType: text('warranty_type'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('warranties_product_id_idx').on(table.productId),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'warranties_product_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.sourceDocumentId],
      foreignColumns: [documents.id],
      name: 'warranties_source_document_id_fk',
    }).onDelete('set null'),
  ],
)

export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceDocumentId: uuid('source_document_id'),
    issuerCompanyId: uuid('issuer_company_id'),
    code: text('code'),
    discountType: discountTypeEnum('discount_type').notNull(),
    // Whole number 0-100 for 'percentage', minor units in `currency` for
    // 'fixed_amount', unused (0) for 'other'.
    discountValue: integer('discount_value').notNull(),
    currency: text('currency'),
    validFrom: date('valid_from', { mode: 'date' }),
    expiresOn: date('expires_on', { mode: 'date' }),
    minimumPurchaseMinorUnits: integer('minimum_purchase_minor_units'),
    conditions: text('conditions'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.sourceDocumentId],
      foreignColumns: [documents.id],
      name: 'coupons_source_document_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.issuerCompanyId],
      foreignColumns: [companies.id],
      name: 'coupons_issuer_company_id_fk',
    }).onDelete('set null'),
  ],
)

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    receiptId: uuid('receipt_id'),
    documentId: uuid('document_id'),
    categoryId: uuid('category_id'),
    amountMinorUnits: integer('amount_minor_units').notNull(),
    currency: text('currency').notNull(),
    expenseDate: date('expense_date', { mode: 'date' }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.receiptId],
      foreignColumns: [receipts.id],
      name: 'expenses_receipt_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.documentId],
      foreignColumns: [documents.id],
      name: 'expenses_document_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'expenses_category_id_fk',
    }).onDelete('set null'),
  ],
)

export const documentRelations = pgTable(
  'document_relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceDocumentId: uuid('source_document_id').notNull(),
    targetDocumentId: uuid('target_document_id').notNull(),
    relationType: relationTypeEnum('relation_type').notNull(),
    // Null confidence + confirmedByUser=true: every relation created so far
    // is a direct manual link, not an AI proposal (that lands in a later
    // phase and will populate confidence instead).
    confidence: numeric('confidence', { precision: 3, scale: 2, mode: 'number' }),
    confirmedByUser: boolean('confirmed_by_user').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex('document_relations_unique_idx').on(
      table.sourceDocumentId,
      table.targetDocumentId,
      table.relationType,
    ),
    index('document_relations_target_document_id_idx').on(table.targetDocumentId),
    check('document_relations_no_self_reference', sql`${table.sourceDocumentId} <> ${table.targetDocumentId}`),
    foreignKey({
      columns: [table.sourceDocumentId],
      foreignColumns: [documents.id],
      name: 'document_relations_source_document_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.targetDocumentId],
      foreignColumns: [documents.id],
      name: 'document_relations_target_document_id_fk',
    }).onDelete('cascade'),
  ],
)
