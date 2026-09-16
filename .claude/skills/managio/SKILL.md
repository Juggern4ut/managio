# AI Agent Skills — Private Document Manager

This file describes the project context, architecture, rules, workflows, and implementation conventions an AI coding agent must follow.

## Skill: Project context

You are working on a self-hosted, privacy-first personal document management application.

The application manages:

- Physical mail scanned with an office scanner
- Digital mail and email attachments
- Smartphone photographs
- Bills, invoices, letters, contracts, and insurance documents
- Receipts and expenses
- Products and warranties
- Coupons and expiration dates
- Relationships between documents, companies, products, and transactions

The user prefers:

- Nuxt
- Vue
- Vanilla JavaScript where appropriate
- TypeScript
- Node.js
- Web applications and PWAs
- Docker-based deployment

Use Python only when it offers a clear advantage for document processing or machine learning.

## Skill: Core architectural principles

### Privacy first

- Original documents, OCR text, and metadata must remain on the user's infrastructure.
- Do not use external AI APIs unless the user explicitly requests and approves them.
- Assume documents contain sensitive personal, financial, insurance, and family information.
- Local AI should preferably run without outbound internet access.
- Never log document contents, OCR text, personal data, or full AI prompts by default.

### Original files are immutable

- Never modify or overwrite the original upload.
- Store derived files separately.
- Derived artifacts may include:
  - OCR text
  - Searchable PDF
  - Preview images
  - Extracted metadata
  - AI classification
  - AI extraction
- Every derived result must be traceable to the source document and processing version.

### Human review is mandatory for uncertainty

- AI results are proposals, not unquestionable truth.
- Low-confidence results must enter a review queue.
- Users must be able to edit every extracted field.
- Preserve whether a value was:
  - extracted automatically
  - inferred by a rule
  - suggested by AI
  - entered or confirmed by a user

### The application owns the truth

AI must not directly mutate business data without validation.

Preferred flow:

```text
OCR text
  -> deterministic extraction
  -> AI proposal
  -> schema validation
  -> domain validation
  -> confidence evaluation
  -> user review if necessary
  -> database transaction
```

## Skill: Technology conventions

Use:

- Nuxt 4
- Vue
- TypeScript
- Nitro server routes
- PostgreSQL
- Zod
- Redis
- BullMQ
- Docker Compose
- OCRmyPDF and Tesseract initially
- Ollama through an abstraction layer

Use PostgreSQL full-text search initially. Add pgvector only when semantic search is actually needed.

Use filesystem storage initially, but hide it behind a storage interface so MinIO can be introduced later.

## Skill: Repository structure

Prefer a structure similar to:

```text
app/
├── app/
│   ├── pages/
│   ├── components/
│   ├── composables/
│   └── layouts/
├── server/
│   ├── api/
│   ├── services/
│   │   ├── documents/
│   │   ├── storage/
│   │   ├── ocr/
│   │   ├── ai/
│   │   ├── classification/
│   │   └── extraction/
│   ├── jobs/
│   └── utils/
├── worker/
│   ├── processors/
│   └── queues/
├── shared/
│   ├── schemas/
│   └── types/
├── db/
│   ├── migrations/
│   └── seeds/
├── tests/
├── docker-compose.yml
└── package.json
```

Adapt the exact layout to the existing repository instead of reorganizing the whole project unnecessarily.

## Skill: Domain model

Distinguish these concepts:

### Document

A physical or digital artifact, such as a PDF, scan, image, invoice, letter, or receipt.

### Company

An issuer, merchant, insurer, provider, or other organization.

### Receipt

A structured representation of a purchase, usually backed by one or more documents.

### Expense

A financial record derived from a receipt or another verified source.

### Product

An item purchased by the user.

### Warranty

A coverage record associated with a product and backed by supporting documents.

### Coupon

A discount entitlement with an issuer, conditions, and validity dates.

### Relation

An explicit connection between documents or entities, such as:

- `issued_by`
- `concerns_company`
- `supports_purchase`
- `proves_warranty`
- `related_to`
- `duplicate_of`
- `part_of_case`

Do not use folders as the only organizational model.

## Skill: Document ingestion

Supported ingestion sources may include:

- Browser upload
- Smartphone camera upload
- Scanner folder
- Email attachments
- Manual import

Every ingestion flow must:

1. Validate the file.
2. Calculate a cryptographic hash.
3. Detect duplicates.
4. Store the immutable original.
5. Create a database record.
6. Queue asynchronous processing.
7. Return a document ID and processing status.

Do not perform long OCR or AI operations inside a synchronous HTTP request.

## Skill: Background processing

Use BullMQ and Redis for long-running work.

Jobs should be:

- idempotent
- retryable
- observable
- associated with a document ID
- safe to resume after a crash

Recommended stages:

```text
VALIDATE
PREPROCESS
OCR
CLASSIFY
EXTRACT
RESOLVE_ENTITIES
DETECT_RELATIONS
INDEX
```

Each stage must record:

- status
- start time
- end time
- error code
- safe diagnostic message
- processor version

Do not include raw document text in normal logs.

## Skill: OCR

Use OCRmyPDF and Tesseract initially.

For PDFs:

1. Preserve the original PDF.
2. Generate a derived searchable PDF.
3. Extract OCR text.
4. Store OCR text independently for search.
5. Record OCR language configuration and tool versions.

For images:

1. Validate image dimensions and format.
2. Rotate or preprocess when needed.
3. Convert to a suitable intermediate format.
4. Run OCR.
5. Store the extracted text and preview.

OCR text may be imperfect. Preserve uncertainty rather than inventing missing values.

## Skill: Extraction rules

Before using AI, use deterministic methods for obvious values:

- ISO-like dates
- Swiss dates such as `14.09.2026`
- CHF amounts
- Invoice numbers
- Due dates
- Coupon codes
- Expiration phrases such as `gültig bis`
- Common company names

Normalize values internally:

- Dates: ISO `YYYY-MM-DD`
- Money: integer minor units plus currency
- Enumerations: controlled values
- Unknown values: `null`, not fabricated values

Store provenance for important extracted values whenever practical:

- source page
- source text snippet
- extraction method
- confidence

## Skill: Local AI integration

Use an interface rather than coupling business logic directly to Ollama.

Example:

```ts
interface DocumentAIProvider {
  classify(input: ClassificationInput): Promise<ClassificationProposal>;
  extract<T>(
    input: ExtractionInput,
    schema: ZodSchema<T>,
  ): Promise<ExtractionProposal<T>>;
}
```

Default behavior:

- Send OCR text rather than original files.
- Use strict schemas.
- Validate all output with Zod.
- Record model name and model version.
- Set timeouts.
- Retry transient failures.
- Reject malformed output.
- Never trust arbitrary free-form AI output.
- Do not allow the model to execute database queries or shell commands.

Separate:

1. Classification
2. Type-specific extraction
3. Entity matching
4. Relationship proposals

Do not use one giant prompt for every task.

## Skill: AI schemas

Use controlled values where possible.

Example document types:

```ts
type DocumentType =
  | "unknown"
  | "letter"
  | "invoice"
  | "receipt"
  | "contract"
  | "insurance_document"
  | "coupon"
  | "other";
```

Nullable fields are preferable to fabricated values.

Every AI proposal should include, where useful:

- proposed value
- confidence
- reason or evidence
- source reference
- model information

AI output must be validated twice:

1. Structural validation with Zod.
2. Domain validation in application code.

## Skill: Domain-specific extraction

### Receipt extraction

Possible fields:

- merchant
- purchase date
- total
- currency
- tax
- line items
- product identifiers

Validate that:

- total is plausible
- currency is supported
- dates are valid
- line-item totals do not silently replace the receipt total
- uncertain values remain uncertain

### Coupon extraction

Possible fields:

- issuer
- code
- discount type
- discount value
- valid-from date
- expiration date
- minimum purchase
- restrictions

Never assume a coupon is still valid merely because an expiration date was not found.

### Warranty extraction

Possible fields:

- product
- seller
- purchase date
- warranty duration
- warranty end date
- supporting document

Do not assert legal warranty rights from ambiguous text. Store what the document says and clearly distinguish extracted facts from legal interpretation.

### Invoice extraction

Possible fields:

- issuer
- invoice number
- invoice date
- due date
- amount
- currency
- account or contract reference

Do not mark an invoice as paid unless payment evidence exists.

## Skill: Entity resolution

When matching a company, product, or document:

- Normalize names for comparison.
- Keep the original display name.
- Use multiple signals where available.
- Avoid silent merges.
- Store confidence.
- Require confirmation for ambiguous matches.
- Preserve aliases such as abbreviations and legal company names.

Potential signals:

- issuer name
- postal address
- website
- phone number
- invoice identifiers
- repeated historical documents
- user corrections

## Skill: Database and transactions

Use database transactions when creating related records.

For example, receipt processing may create:

- receipt
- receipt items
- company association
- expense
- document relation

The operation must be safe to retry without duplicates.

Use unique constraints and idempotency keys where appropriate.

Do not store money as floating-point values. Prefer integer minor units plus currency.

## Skill: API design

API endpoints should:

- validate all input
- return consistent error structures
- avoid exposing internal file paths
- use document IDs rather than raw storage paths
- support pagination
- avoid returning OCR text unless requested
- enforce authorization
- provide processing status

Long-running operations should return a job/document status rather than block the request.

## Skill: Frontend and UX

The main workflow is an inbox.

The user should be able to:

1. Upload or capture a document.
2. See processing progress.
3. Open the document preview.
4. Inspect OCR text and extracted fields.
5. Accept or correct proposals.
6. Assign company/category.
7. See related documents.
8. Search later.

Important UI states:

- uploading
- queued
- processing
- needs review
- completed
- failed
- duplicate detected

Make the upload and camera workflow mobile-friendly.

Do not hide uncertainty. Show confidence or review indicators when they help the user.

## Skill: Security

Treat all uploaded files as untrusted input.

Implement:

- MIME and extension validation
- file size limits
- safe filenames
- storage outside public web roots
- authorization checks
- rate limiting where exposed
- secure session handling
- HTTPS in deployed environments
- no document contents in logs
- dependency updates
- backups and restore testing

If the service is exposed to the internet, consider malware scanning and stronger isolation for OCR/PDF tools.

## Skill: Testing

Write tests for:

- date extraction
- CHF amount extraction
- duplicate detection
- file validation
- OCR job retries
- idempotent processing
- schema validation
- receipt totals
- coupon expiration handling
- warranty date calculations
- entity matching
- authorization
- database transaction behavior

Maintain a small anonymized or synthetic evaluation corpus for OCR and AI extraction.

Do not add real private documents to the repository.

## Skill: Implementation workflow for the coding agent

Before changing code:

1. Inspect the existing repository.
2. Identify current framework, package manager, and conventions.
3. Check whether the requested feature already exists.
4. Propose the smallest coherent change.
5. Identify database migrations and backward-compatibility concerns.
6. Implement incrementally.
7. Add tests.
8. Run linting, type checking, and relevant tests.
9. Summarize changed files, commands run, and remaining risks.

Do not:

- rewrite the entire application without approval
- introduce Python services without a concrete reason
- add external AI APIs by default
- store secrets in source control
- silently delete or overwrite original documents
- make irreversible schema changes without migration planning
- let AI output bypass validation
- claim OCR or extraction is correct without evidence

## Skill: Definition of done

A feature is complete only when:

- the implementation is type-safe
- input is validated
- errors are handled
- background work is retryable if applicable
- database changes have migrations
- tests cover important behavior
- privacy implications are considered
- the original document remains preserved
- the UI exposes useful processing and review states
- documentation is updated where the workflow or architecture changes
