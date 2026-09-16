# Private Document Manager — Project Roadmap

## 1. Project vision

Build a self-hosted, privacy-first document management application for:

- Physical mail scanned with an office scanner
- Digital mail and email attachments
- Smartphone photographs and scans
- Receipts and expense tracking
- Product purchases and warranty tracking
- Coupons and expiration dates
- Search, grouping, and relationships between documents

The application must preserve original files, make documents searchable, extract structured information, and allow human correction whenever automation is uncertain.

## 2. Guiding principles

1. **Local-first privacy**
   - Original documents and OCR text stay on the user's infrastructure.
   - No external LLM API is required.
   - Local AI services must be isolated and preferably have no outbound network access.

2. **Original files are authoritative**
   - Never overwrite the original upload.
   - OCR output, previews, metadata, and AI results are derived artifacts.
   - Every derived result must be reproducible from the original file.

3. **AI assists; the application remains authoritative**
   - AI proposes classifications and extracted values.
   - The backend validates and stores structured data.
   - Users can correct any result.
   - Low-confidence results enter a review inbox.

4. **Incremental complexity**
   - Begin with upload, OCR, search, and manual metadata.
   - Add AI extraction only after the basic document workflow is reliable.
   - Add expenses, warranties, coupons, and relationship detection later.

5. **TypeScript-first**
   - Use Nuxt/Nitro and Node.js for the main application.
   - Use external CLI tools or isolated services for OCR and local AI.
   - Introduce Python only when a concrete ML/document-processing requirement justifies it.

## 3. Recommended technology stack

### Application

- Nuxt 4
- Vue
- TypeScript
- Nitro server routes
- Zod for runtime validation
- Pinia only if client-side global state becomes necessary

### Persistence

- PostgreSQL
- pgvector later for semantic search
- Local filesystem initially for document blobs
- Optional MinIO later for object storage

### Background processing

- Redis
- BullMQ
- Dedicated Node.js worker process

### Document processing

- OCRmyPDF for searchable PDFs and OCR orchestration
- Tesseract initially
- PaddleOCR as an alternative for difficult scans
- ImageMagick or equivalent image preprocessing where useful
- PDF rendering for previews

### Local AI

- Ollama initially
- A replaceable TypeScript provider interface
- Structured JSON output validated with Zod
- Optional embeddings provider later

### Deployment

- Docker Compose
- Reverse proxy with HTTPS
- Separate application, worker, database, Redis, OCR, and AI containers where practical
- Automated backups for PostgreSQL and document storage

## 4. High-level architecture

```text
Browser / PWA
    |
    v
Nuxt 4 + Nitro
    |
    +--> PostgreSQL
    |
    +--> Document storage
    |
    +--> Redis / BullMQ
               |
               v
          Node worker
               |
               +--> file validation
               +--> image preprocessing
               +--> OCRmyPDF / Tesseract
               +--> deterministic extraction
               +--> local LLM
               +--> relationship detection
               +--> indexing
```

## 5. Roadmap

### Phase 0 — Scope and design

Deliverables:

- Define supported document types
- Define the initial data model
- Define the processing state machine
- Define privacy and backup requirements
- Define a minimal UI wireframe

Initial document types:

- `unknown`
- `letter`
- `invoice`
- `receipt`
- `contract`
- `insurance_document`
- `coupon`
- `other`

Do not attempt to model every possible document type at this stage.

### Phase 1 — Project foundation

Tasks:

- Create Nuxt 4 TypeScript project
- Configure linting, formatting, and testing
- Add PostgreSQL with migrations
- Add Docker Compose for local development
- Implement authentication or restrict access behind a trusted reverse proxy
- Add basic application layout and navigation
- Add health checks and structured logging

Deliverable:

- Empty but deployable application with database connectivity.

### Phase 2 — Document ingestion

Tasks:

- Upload PDFs and common image formats
- Validate MIME type, extension, and file size
- Generate a stable document ID
- Store the immutable original file
- Create a database record
- Add upload status and error handling
- Add a filesystem inbox watcher as a later ingestion method
- Add a basic smartphone-friendly upload page

Deliverable:

- A user can upload a document and see it in the application.

### Phase 3 — OCR and previews

Tasks:

- Add BullMQ and a worker
- Create processing jobs
- Generate PDF/image previews
- Run OCRmyPDF/Tesseract for PDFs
- Extract plain OCR text
- Store OCR text separately from the original
- Display OCR text beside the document preview
- Make processing retryable and idempotent
- Record per-stage errors and timings

Deliverable:

- Uploaded documents become searchable without any AI.

### Phase 4 — Search and manual organisation

Tasks:

- Full-text search using PostgreSQL
- Search by OCR text, filename, date, and metadata
- Add manual document type
- Add manual company/issuer
- Add user-defined categories
- Add tags
- Add an inbox for unreviewed documents
- Add document detail and edit views

Deliverable:

- The system is already useful without automated classification.

### Phase 5 — Core domain model

Introduce explicit entities:

- `documents`
- `companies`
- `categories`
- `people` only if genuinely needed
- `products`
- `receipts`
- `receipt_items`
- `expenses`
- `warranties`
- `coupons`
- `document_relations`

Important distinction:

- A document is a file or correspondence artifact.
- A receipt represents a purchase.
- A product is something purchased.
- A warranty is a coverage record.
- A coupon is a discount entitlement.
- A relation connects documents and entities.

Deliverable:

- Domain model supports more than simple folders.

### Phase 6 — Deterministic extraction

Before using an LLM, implement reliable extraction for:

- Dates
- Amounts
- Currencies
- Invoice numbers
- Due dates
- Coupon expiration dates
- Coupon codes
- Common issuer names
- Swiss currency and date formats

Tasks:

- Normalize dates to ISO format
- Normalize money to integer minor units where possible
- Preserve original extracted text
- Store source text snippets or page references for extracted values
- Assign extraction confidence and provenance

Deliverable:

- Common values can be extracted transparently and reproducibly.

### Phase 7 — Local AI classification

Tasks:

- Run Ollama locally
- Create an AI provider interface
- Send OCR text, not original files, by default
- Define strict JSON schemas
- Separate classification from extraction
- Add timeout, retry, and malformed-output handling
- Add model/version metadata to every AI result
- Use confidence thresholds
- Route uncertain results to manual review

Suggested interfaces:

```ts
interface DocumentClassifier {
  classify(input: ClassificationInput): Promise<ClassificationResult>
}

interface DocumentExtractor {
  extract<T>(input: ExtractionInput, schema: ZodSchema<T>): Promise<T>
}
```

Deliverable:

- The system proposes document types, issuers, and metadata while remaining fully reviewable.

### Phase 8 — Specialized extraction

Implement one domain at a time.

#### Receipts

Extract:

- Merchant
- Purchase date
- Total
- Currency
- Line items
- Taxes if available
- Payment method only if useful
- Product identifiers where available

#### Coupons

Extract:

- Issuer
- Code
- Discount type
- Discount value
- Valid-from date
- Expiration date
- Restrictions
- Minimum purchase amount

#### Warranties

Extract:

- Product
- Seller
- Purchase date
- Warranty duration
- Warranty end date
- Warranty document references
- Proof-of-purchase references

#### Invoices

Extract:

- Issuer
- Invoice number
- Invoice date
- Due date
- Amount
- Currency
- Contract/account reference
- Payment status only when supported by actual evidence

Deliverable:

- Structured domain features work independently and can be corrected manually.

### Phase 9 — Relationships and entity resolution

Tasks:

- Match issuer names to existing companies
- Detect likely duplicate documents
- Link receipts to products
- Link products to warranties
- Link invoices to contracts or companies
- Group related documents into a timeline
- Add explicit user confirmation for uncertain links
- Avoid silently merging entities

Deliverable:

- Users can view everything related to a company, purchase, product, or insurance matter.

### Phase 10 — Ingestion automation

Tasks:

- Email ingestion for attachments
- Dedicated upload email address or mailbox integration
- Scanner network folder watcher
- Automatic file deduplication
- Batch upload
- Smartphone camera capture
- Optional automatic rotation/cropping
- Notification for failed or uncertain processing

Deliverable:

- Documents flow into the inbox with minimal manual effort.

### Phase 11 — Dashboards and reminders

Tasks:

- Monthly and yearly expense summaries
- Expense categories
- Coupon expiration dashboard
- Warranty expiration dashboard
- Upcoming invoice due dates
- Review queue
- Missing metadata dashboard
- Export to CSV/JSON/PDF where useful

Deliverable:

- The application becomes a practical personal information hub.

### Phase 12 — Hardening and maintenance

Tasks:

- Automated encrypted backups
- Restore testing
- Audit log for edits and deletions
- Encryption at rest where appropriate
- Access control
- Rate limiting
- File malware scanning if exposed to untrusted uploads
- Monitoring and alerting
- Dependency update process
- AI model evaluation dataset
- Regression tests for OCR and extraction

Deliverable:

- Reliable, maintainable, privacy-conscious production system.

## 6. Suggested initial database entities

### documents

- `id`
- `original_filename`
- `mime_type`
- `storage_key`
- `sha256`
- `uploaded_at`
- `document_date`
- `document_type`
- `processing_status`
- `ocr_text`
- `review_status`
- `created_by`
- `model_version`
- `created_at`
- `updated_at`

### companies

- `id`
- `name`
- `normalized_name`
- `address`
- `website`
- `notes`

### document_company

- `document_id`
- `company_id`
- `relationship_type`
- `confidence`
- `confirmed_by_user`

### receipts

- `id`
- `document_id`
- `merchant_company_id`
- `purchase_date`
- `total_minor_units`
- `currency`
- `tax_minor_units`

### receipt_items

- `id`
- `receipt_id`
- `description`
- `quantity`
- `unit_price_minor_units`
- `total_minor_units`
- `product_id`

### products

- `id`
- `name`
- `serial_number`
- `model_number`
- `manufacturer`
- `purchase_date`

### warranties

- `id`
- `product_id`
- `source_document_id`
- `starts_on`
- `ends_on`
- `warranty_type`
- `notes`

### coupons

- `id`
- `source_document_id`
- `issuer_company_id`
- `code`
- `discount_type`
- `discount_value`
- `valid_from`
- `expires_on`
- `conditions`

### document_relations

- `source_document_id`
- `target_document_id`
- `relation_type`
- `confidence`
- `confirmed_by_user`

## 7. Processing state machine

```text
UPLOADED
  -> VALIDATED
  -> PREPROCESSED
  -> OCR_COMPLETED
  -> CLASSIFIED
  -> EXTRACTED
  -> RELATIONS_DETECTED
  -> INDEXED
  -> COMPLETE
```

Any stage may transition to:

- `FAILED_RETRYABLE`
- `FAILED_PERMANENT`
- `NEEDS_REVIEW`

Processing must be idempotent. Re-running a job must not create duplicate receipts, coupons, companies, or relationships.

## 8. Definition of done for the first usable release

The first release should support:

1. Uploading a PDF or image.
2. Storing the original file.
3. Running OCR.
4. Searching OCR text.
5. Viewing the original and extracted text.
6. Manually assigning a document type, company, category, and date.
7. Reviewing processing errors.
8. Backing up and restoring the data.
9. Running entirely on the user's own server.

Do not require AI, email ingestion, expense analytics, or automatic warranties for the first release.
