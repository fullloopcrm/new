# tenantDb Conversion — Batch 1: the next 20 EASY routes

**Status:** planning / file-only (no route code converted by this doc)
**Author:** W2 (resolver + tenant-isolation lane)
**Date:** 2026-07-12
**Scope:** `platform/src/app/api/**/route.ts`
**Parent map:** `deploy-prep/tenantdb-rollout-plan.md` (§4 Tier 1 recipe + §5 exceptions)
**Leak cross-ref:** `deploy-prep/cross-tenant-leak-register.md` (P1–P7)

---

## 0. What this doc is

The rollout plan (§4) names **145 EASY routes** — routes that already call
`const { tenantId } = await getTenantForRequest()` and hit the DB with raw
`supabaseAdmin`, so conversion is the near-mechanical swap to `tenantDb(tenantId)`.
This doc is the **first executable batch of 20**, in exact conversion order
(§4 sub-order: `finance → invoices → documents → clients → bookings → quotes`),
with the **per-route table-by-table `.eq('tenant_id')` change noted**.

Every table listed below was checked against the route's actual `from(...)` calls
and against the migrations for a `tenant_id` column. Two correctness traps in this
batch were verified, not assumed:

- **`finance/statements`** touches `supabaseAdmin.storage.from('finance')` — that is
  a **Storage bucket**, not a DB table. It must **not** be converted. Only the four
  `bank_statements` DB accesses convert.
- **`documents/[id]/fields`** writes `document_fields`. Unlike the `crew_members`
  landmine (§5b), `document_fields` **has a `tenant_id` column** (mig `031_documents.sql`
  L111), so `tenantDb` genuinely scopes it — no hand-written parent guard required.

---

## 1. The uniform per-route change

For each route, the edit is the §4 Tier 1 recipe:

```ts
import { tenantDb } from '@/lib/tenant-db'
const { tenantId } = await getTenantForRequest()   // already present
const db = tenantDb(tenantId)                       // add
// SCOPED tables:  supabaseAdmin.from('<t>')  →  db.from('<t>')
// then drop the now-redundant .eq('tenant_id', tenantId) (wrapper injects it)
// CROSS-TENANT tables / Storage: leave supabaseAdmin as-is + inline // cross-tenant note
```

Three shapes of change appear in the table below:

- **scope-read** — a `select/update/delete` on a `tenant_id` table. `db.from()`
  auto-injects `.eq('tenant_id', tenantId)`.
- **stamp-write** — an `insert/upsert`. `db.from().insert()` auto-stamps `tenant_id`
  **last**, so a forged body `tenant_id` can't win.
- **leave** — a cross-tenant table (§5a) or Storage bucket. Stays on `supabaseAdmin`.

> **Redundant-vs-missing:** most rows below already carry `.eq('tenant_id', …)` on
> every read (the "today" column says *scoped*). For those, conversion is
> hardening + cleanup, not a bug fix. The rows flagged **UNSCOPED TODAY** are live
> read leaks that conversion actually closes — do those with the most care and a
> witness/probe.

---

## 2. The batch (exact order)

Legend — **today**: `scoped` = route already has `.eq('tenant_id')` on that access;
`stamp` = insert/upsert; `UNSCOPED` = live leak conversion closes; `leave` = §5 exception.

### FINANCE (13) — top sensitivity, do first

| # | Route (`POST`/`GET`/…) | Tables → action | today | Notes |
|---|---|---|---|---|
| 1 | `finance/summary` `GET` | `bookings`,`payments`,`referral_commissions`,`team_member_payouts` → scope-read (10 reads) | all scoped | Pure mechanical; largest read-fan-out in the batch. |
| 2 | `finance/revenue` `GET` | `bookings` → scope-read (×2) | scoped | Mechanical. |
| 3 | `finance/pnl` `GET` | `bookings`,`expenses` → scope-read | scoped | Mechanical. |
| 4 | `finance/cash-flow` `GET` | `bookings`,`invoices`,`recurring_expenses` → scope-read | scoped | Mechanical. |
| 5 | `finance/ar-aging` `GET` | `bookings`,`invoices` → scope-read | scoped | Mechanical. |
| 6 | `finance/expenses` `GET`+`POST` | `expenses` → scope-read (GET) + stamp-write (POST) | GET scoped | **FK guard separate:** POST `entity_id` injection = register **P5**. `tenantDb` stamps the row's own `tenant_id` but does **not** validate `entity_id` ownership — add that guard + flip the P5 witness. |
| 7 | `finance/bank-accounts` `GET`+`POST` | `bank_accounts` → scope-read + stamp-write | GET scoped | **FK guard separate:** POST `entity_id`+`coa_id` injection = register **P4** (💰 bank, read-side embeds both parents). Add ownership checks; flip P4 witness. |
| 8 | `finance/bank-transactions` `GET` | `bank_transactions` → scope-read | scoped | Mechanical. |
| 9 | `finance/chart-of-accounts` `GET`+`POST` | `chart_of_accounts` → scope-read + stamp-write | GET scoped | Mechanical; `coa` has `tenant_id` (mig 032). |
| 10 | `finance/entities` `GET`+`POST` | `entities` → scope-read + stamp-write | GET scoped | Mechanical; `entities` has `tenant_id` (mig 034). |
| 11 | `finance/periods` `GET`+`POST(upsert)` | `accounting_periods` → scope-read + stamp-write | GET scoped | **FK guard separate:** upsert `entity_id` injection = register **P6**; on-conflict key is `(tenant_id,entity_id,year,month)`. Add ownership check; flip P6 witness. |
| 12 | `finance/reconcile-candidates` `GET` | `bank_transactions`,`bookings`,`expenses`,`invoices` → scope-read (4) | all scoped | Mechanical; 4-table read fan-out. |
| 13 | `finance/statements` `GET`+`POST`+`DELETE` | `bank_statements` → scope-read + stamp-write (×4) | scoped | **LEAVE** `supabaseAdmin.storage.from('finance')` (L59) — **Storage bucket, not a table.** Convert only the 4 `bank_statements` DB accesses. |

### INVOICES (1)

| # | Route | Tables → action | today | Notes |
|---|---|---|---|---|
| 14 | `invoices` `GET`+`POST` | `invoices` → scope-read + stamp-write; `bookings`,`quotes` (prefill) → scope-read | scoped | **FK guard separate:** POST `client_id`/`booking_id`/`quote_id` injection = register **P2**. Prefill re-fetches are already `.eq(tenant_id)` (register B5 control) — conversion keeps them scoped, but the raw FK columns still need the ownership guard. |

### DOCUMENTS (2)

| # | Route | Tables → action | today | Notes |
|---|---|---|---|---|
| 15 | `documents/[id]/fields` `GET`+`POST`+`PUT` | `documents` → scope-read; `document_fields` → scope-read + stamp-write | mostly scoped | `document_fields` **has `tenant_id`** (mig 031 L111) → `tenantDb` scopes it; **no** join-table hand-guard needed (unlike `crew_members`). One `document_fields` access is **UNSCOPED TODAY** (from=6, eq=4 incl. 2 inserts) — conversion closes it. Pair with a probe. |
| 16 | `documents/[id]/void` `POST` | `documents` → scope-read + scope-update (×2) | 1 of 2 scoped | One `documents` access **UNSCOPED TODAY** — conversion closes it. Probe the void path. |

### CLIENTS (3)

| # | Route | Tables → action | today | Notes |
|---|---|---|---|---|
| 17 | `clients` `GET`+`POST` | `clients` → scope-read + stamp-write | GET scoped | Mechanical; POST inserts scalars (register §4 sweep: no body FK). |
| 18 | `clients/[id]` `GET`+`PUT`+`DELETE` | `clients` → scope-read/update/delete (×3) | all scoped | Mechanical; each op already `.eq(tenant_id)`. |
| 19 | `clients/stats` `GET` | `bookings`,`clients` → scope-read (5) | all scoped | Mechanical. |

### BOOKINGS (1)

| # | Route | Tables → action | today | Notes |
|---|---|---|---|---|
| 20 | `bookings` `GET`+`POST` | `bookings` → scope-read + stamp-write; `team_members` → scope-read; **`service_types` → scope-read (UNSCOPED TODAY)**; `tenants` → **leave** | mixed | **This conversion closes register P1's live READ leak:** `service_types.select('name').eq('id', …)` has **no** tenant filter today → `db.from('service_types')` injects it. `team_members` lookups are already scoped. `tenants` is cross-tenant-by-design → **leave** on `supabaseAdmin` + `// cross-tenant` note. **FK guard separate:** POST `client_id` injection (P1) still needs an ownership check. Highest-value conversion in the batch — pair with the P1 witness flip. |

---

## 3. Per-route definition of done

Same as rollout-plan §8, applied to each of the 20:

1. Every `tenant_id` table access uses `db = tenantDb(tenantId)`.
2. **Leave** rows (`bookings::tenants`, `statements::storage.from('finance')`) stay on
   `supabaseAdmin` with an inline `// cross-tenant by design:` / `// storage bucket:` note.
3. Redundant `.eq('tenant_id', …)` removed after the swap (harmless if left, cleaner gone).
4. For the **UNSCOPED TODAY** rows (#15 `document_fields`, #16 `documents`, #20
   `service_types`) add/keep a `route.isolation.test.ts` proving the foreign row is
   now filtered out — these are the rows where conversion changes behavior.
5. **FK-injection rows (#6,#7,#11,#14,#20)**: `tenantDb` conversion is **not** the fix
   for the register P1/P2/P4/P5/P6 leaks — those need a separate caller-supplied-FK
   ownership guard. Convert **and** land the guard, then flip the witness from
   expect-leak to expect-reject.
6. `npx tsc --noEmit` clean; the route's tests green.

---

## 4. What comes after this batch

Next in §4 sub-order (batch 2 starts here):
`quotes` (register P3 `client_id`/`deal_id` FK) → `finance/receipts` (touches
`tenants` — partial convert, leave `tenants`) → `finance/cleaner-income` →
`finance/payroll` (`payroll_payments`,`team_members`) → `finance/pending` →
`finance/audit-log` → `clients/analytics` → then the remaining ~118 EASY routes
(`bookings/*`, `deals/*`, `jobs/*`, `schedules/*`, `settings/*`, …).

**This doc converts nothing.** It is the ordered work-list for the first 20; each
route is converted per-route, file-only, with `tsc --noEmit` + its probe, in the
order above.
