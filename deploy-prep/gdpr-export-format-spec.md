# GDPR / CCPA Data Export — Format Specification (P1)

**Status:** documentation of the shipped export (commit `84687736`, W1 lane).
**Source of truth:** `platform/src/lib/gdpr-export.ts` + `platform/src/app/api/gdpr/export/route.ts`.
This spec describes what those files actually produce — it is not a proposal.

The single defining rule: **every section is `select('*')` of its source table(s).**
The field set of a section is therefore *exactly the current column set of the
underlying table(s)*, not a hand-maintained allowlist. New columns added by later
`ALTER TABLE ... ADD COLUMN` migrations flow into the export automatically. The
"core columns" tables below are a **verified snapshot as of this commit** for
reader orientation — they are reference, not contract. The contract is: whatever
the table has, the export emits.

---

## 1. Endpoint

```
GET /api/gdpr/export?format=zip|json[&clientId=<uuid>]
```

| Param      | Values              | Default | Meaning                                                                 |
|------------|---------------------|---------|-------------------------------------------------------------------------|
| `format`   | `zip` \| `json`     | `zip`   | `zip` → CSV-per-domain + `export.json` + `manifest.txt`. `json` → raw bundle. |
| `clientId` | UUID                | *(none)*| Scope to a single client (a Data Subject Access Request). Omitted → full-tenant export. |

- **Authorization:** gated on `settings.edit` (owner/admin) via `requirePermission`. Emits raw customer PII.
- **Tenant isolation:** every query is filtered by `tenant_id`. The one table without a
  `tenant_id` column (`crm_notes`) is scoped through client ids that are themselves
  tenant-filtered. A supplied `clientId` is verified to belong to the caller's tenant
  (`clients.id = clientId AND tenant_id = <tenant>`) **before** any data is read;
  a non-matching id returns `404 Client not found`.
- **Errors:** `400` for a bad `format` or a non-UUID `clientId`; `404` for an
  unknown/foreign `clientId`; `500` on any collection failure (message surfaced).

---

## 2. JSON bundle envelope

`format=json` returns this object directly; in `format=zip` it is written verbatim
as `export.json` (pretty-printed, 2-space indent). Shape (`GdprExportBundle`):

```jsonc
{
  "generated_at": "2026-07-12T00:00:00.000Z", // ISO-8601 UTC, server clock at request time
  "tenant_id":    "<uuid>",                    // caller's tenant
  "client_id":    "<uuid> | null",             // null ⇒ full-tenant export
  "counts": {                                  // row count per section (post-merge)
    "bookings":       0,
    "invoices":       0,
    "communications": 0,
    "notes":          0
  },
  "sections": {                                // the data itself
    "bookings":       [ { /* row */ }, ... ],
    "invoices":       [ { /* row */ }, ... ],
    "communications": [ { "_source": "sms|comhub", /* row */ }, ... ],
    "notes":          [ { "_source": "booking_note|crm_note", /* row */ }, ... ]
  }
}
```

- The four `sections` / `counts` keys are **fixed and always present**, even when empty.
- `counts[section] === sections[section].length` by construction.
- Row objects are the raw DB rows. Two sections (`communications`, `notes`) merge
  more than one table and prepend a synthetic **`_source`** discriminator column
  (see §4). The other two sections carry no synthetic columns.

---

## 3. ZIP bundle contents (`format=zip`)

Filename: `gdpr-export-<tenant|client-<uuid>>-<YYYY-MM-DD>.zip`
(`Content-Type: application/zip`, `Content-Disposition: attachment`).

| Entry               | Contents                                                        |
|---------------------|-----------------------------------------------------------------|
| `manifest.txt`      | Human-readable header: generated-at, tenant, scope, per-file row counts. |
| `export.json`       | The full bundle from §2 (pretty-printed).                        |
| `bookings.csv`      | `rowsToCsv(sections.bookings)`                                   |
| `invoices.csv`      | `rowsToCsv(sections.invoices)`                                   |
| `communications.csv`| `rowsToCsv(sections.communications)`                            |
| `notes.csv`         | `rowsToCsv(sections.notes)`                                      |

### CSV serialization rules (`rowsToCsv`)

The CSV writer is **union-header, order-preserving**, not fixed-column:

1. **Header** = the union of every row's keys, in first-seen order across the row
   array. Merged sections therefore never silently drop columns that only some
   rows have; a row missing a column emits an empty cell for it.
2. **Empty section** (`rows.length === 0`) → empty string (a 0-byte CSV, no header row).
3. **Cell encoding:**
   - `null` / `undefined` → empty cell.
   - objects & arrays → `JSON.stringify(value)` (so `line_items`, `media_urls`,
     `image_urls`, `metadata`, `raw_payload`, etc. serialize as JSON text).
   - everything else → `String(value)`.
4. **Escaping:** every header and cell passes through `csvEscape` (shared with
   `finance-export`) for RFC-4180 quoting **and spreadsheet formula-injection
   neutralization** (leading `= + - @` etc.). This is why CSV export is safe to
   open directly in Excel/Sheets.
5. **Line ending:** rows joined with `\n`.

Because CSV columns follow first-seen key order, a merged section's `_source`
column appears **first** (it is spread first — `{ _source, ...row }`).

---

## 4. Sections — sources, scoping, fields

Each section is assembled in `gdpr-export.ts`. Pagination: all reads page in
1000-row windows to completion; `in(...)` id lists are chunked at 200.

### 4.1 `bookings`

- **Source table:** `bookings` (`select('*')`, ordered `created_at DESC`).
- **Scope:** `tenant_id = <tenant>`; if `clientId` set, also `client_id = clientId`.
- **Synthetic columns:** none.
- **Core columns (snapshot):** `id, tenant_id, client_id, team_member_id,
  schedule_id, service_type_id, service_type, start_time, end_time, status,
  price` (cents), `hourly_rate, pay_rate, recurring_type, notes,
  special_instructions, check_in_time, check_out_time, check_in_lat,
  check_in_lng, worker_token, token_expires_at, payment_status, payment_method,
  payment_date, tip_amount, created_at, updated_at`.
  Plus many later-added columns (`select('*')` includes them all), e.g.
  `job_id, entity_id, property_id, crew_id, referrer_id, ref_code,
  check_out_lat, check_out_lng, check_in_location, check_out_location,
  actual_hours, max_hours, is_emergency, payment_link, stripe_session_id,
  team_member_pay, team_member_paid, partial_payment_cents, final_video_url`, …
  — this list is **not exhaustive**; the export emits the full live column set.

### 4.2 `invoices`

- **Source table:** `invoices` (`select('*')`, ordered `created_at DESC`).
- **Scope:** `tenant_id = <tenant>`; if `clientId` set, also `client_id = clientId`.
- **Synthetic columns:** none.
- **Core columns (snapshot):** `id, tenant_id, client_id, booking_id, quote_id,
  invoice_number, status, title, description, contact_name, contact_email,
  contact_phone, service_address, line_items` (JSON), `subtotal_cents,
  tax_rate_bps, tax_cents, discount_cents, total_cents, amount_paid_cents,
  terms, notes, due_date, issued_at, public_token, sent_at, sent_via,
  first_viewed_at, last_viewed_at, view_count, paid_at, voided_at, void_reason,
  created_by, created_at, updated_at`. Plus later columns (`entity_id`, …).
- **Money is in integer cents** (`*_cents`); `tax_rate_bps` is basis points.

### 4.3 `communications` (merged)

Two sources, tagged by `_source`:

| `_source` | Table                 | Scope                                                                                  |
|-----------|-----------------------|----------------------------------------------------------------------------------------|
| `sms`     | `client_sms_messages` | `tenant_id`; if `clientId`, also `client_id = clientId`. Ordered `created_at DESC`.    |
| `comhub`  | `comhub_messages`     | `tenant_id`; if `clientId`, resolved via `comhub_contacts.client_id → comhub_threads.contact_id → comhub_messages.thread_id`. Full-tenant otherwise. Ordered `sent_at DESC`. |

- **Synthetic column:** `_source` (`'sms'` \| `'comhub'`), first column.
- **`client_sms_messages` core columns:** `id, tenant_id, client_id, direction`
  (`inbound`\|`outbound`), `message, created_at`.
- **`comhub_messages` core columns:** `id, tenant_id, thread_id, contact_id,
  channel` (`sms|email|voice|web|admin|telegram|internal`), `direction`
  (`in|out|auto|system`), `author` (`customer|yinez|admin|system|cleaner`),
  `author_id, body, media_urls` (JSON array), `subject, from_address,
  to_address, external_id, raw_payload` (JSON), `metadata` (JSON), `source_table,
  source_id, flagged_for_review, flagged_reason, flagged_at, flagged_by,
  sent_at, read_at, created_at`.
- The two row shapes differ; the union-header CSV carries the superset of columns,
  empty cells where a source lacks a column (e.g. `sms` rows have no `channel`).

### 4.4 `notes` (merged)

Two sources, tagged by `_source`:

| `_source`      | Table          | Scope                                                                                       |
|----------------|----------------|---------------------------------------------------------------------------------------------|
| `booking_note` | `booking_notes`| `tenant_id`; if `clientId`, restricted to that client's booking ids (`booking_id IN ...`). |
| `crm_note`     | `crm_notes`    | `subject_type = 'client'` AND `subject_id IN <tenant's client ids>` (single id when scoped).|

- **Synthetic column:** `_source` (`'booking_note'` \| `'crm_note'`), first column.
- **`booking_notes` core columns:** `id, tenant_id, booking_id, client_id,
  author_type` (`admin|client|system`), `author_name, content, images` (JSON),
  `created_at`.
- **`crm_notes` core columns:** `id, subject_type, subject_id, body, image_urls`
  (text[]), `author, created_at, updated_at`. (No `tenant_id` column — see §5.)

---

## 5. Known limitations (as shipped)

1. **`crm_notes` client branch currently yields no rows.** The export queries
   `crm_notes` with `subject_type = 'client'`, but the table's CHECK constraint
   permits only `'lead'` and `'tenant'` (`migrations/2026_07_01_crm_notes.sql`),
   and the app writes only those two values (`api/admin/notes`,
   `create-tenant-from-lead`). No row ever has `subject_type = 'client'`, so the
   `crm_note` portion of the `notes` section is effectively inert today.
   Client-attached notes that *do* exist are captured via `booking_notes`
   (which has a real `client_id`). This is a data-model gap in the export's
   assumption, not a serialization bug — flagged for the export owner (A4/A10),
   out of the W1 schema lane. Fix options: (a) widen the `crm_notes` CHECK +
   start writing client-subject notes, or (b) drop the dead branch.

2. **Column set is dynamic.** Per §intro, `select('*')` means the exact CSV/JSON
   columns track the live schema. Consumers must not assume a fixed column list;
   they should read the header row (CSV) or object keys (JSON). The "core columns"
   snapshots above will drift as migrations add columns.

3. **No PII redaction.** This is a *subject access / portability* export — it
   deliberately emits raw PII (names, emails, phones, addresses, message bodies).
   Access control (§1) is the only guard; there is no field-level masking.

---

## 6. Consumer contract summary

- Read `counts` to size/validate; each equals its section length.
- `sections` keys are stable: `bookings`, `invoices`, `communications`, `notes`.
- Discriminate merged rows on `_source`.
- Treat JSON/array columns (`line_items`, `media_urls`, `image_urls`, `metadata`,
  `raw_payload`, `images`) as embedded JSON in CSV cells.
- All money is integer cents; timestamps are ISO-8601 UTC.
- Do not hard-code column lists — the export is `select('*')`.
