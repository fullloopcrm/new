# Billing / Finance / Checkout — Tenant-Scope IDOR Audit (W1)

**Date:** 2026-07-12
**Auditor:** W1 (autonomous)
**Trigger:** Same IDOR class W4 found in a Selena conversation-by-id route — any read/write
by-id on a money/finance route lacking `.eq('tenant_id', …)` or an equivalent ownership check.
**Scope:** All billing / finance / checkout API routes (invoices, quotes, payments, jobs
payments, bookings payment, checkout, admin billing/payments, public token money routes).

## Headline

**No live IDOR of the W4 class was found in the billing/finance/checkout routes.**
Every authenticated by-id read/write is gated by a tenant-scoped query
(`.eq('tenant_id', tenantId).eq('id', id)`), and the tenant id is **not**
caller-controllable (see "Base assumption verified" below). No route was found that
lets tenant A read or mutate tenant B's invoice/quote/payment/job/booking by id.

Because there is no real vulnerability here, **no `it.fails` witness test was written** —
a witness test for a non-existent leak would be a fake test. The residual items below are
defense-in-depth, not exploitable leaks.

## Base assumption verified (the thing the whole audit rests on)

`getTenantForRequest()` / `requirePermission()` derive `tenantId` from one of:

1. **Admin PIN impersonation** — signed `IMPERSONATE_COOKIE` + valid `admin_token`.
2. **PIN admin on tenant's own domain** — `x-tenant-id` header **verified by HMAC sig**
   (`verifyTenantHeaderSig`) + an `admin_token` that is either global-super or
   **minted for that exact tenant** (`verifyTenantAdminToken(token, headerTenantId)`).
3. **Clerk session** — `tenant_members` row looked up by the session `userId`.

No branch trusts a raw, unsigned caller-supplied tenant id. Therefore
`.eq('tenant_id', tenantId)` is a genuine authorization boundary, and by-id queries
carrying it are safe. `src/lib/tenant-query.ts:44-155`.

## Routes reviewed — all PASS (tenant-gated)

| Route | Methods | Gate |
|---|---|---|
| `invoices/[id]` | GET / PATCH / DELETE | `.eq('tenant_id').eq('id')` on gating read + write |
| `invoices/[id]/record-payment` | POST | tenant-scoped invoice read before payment insert |
| `invoices/[id]/send` | POST | tenant-scoped invoice read |
| `invoices/public/[token]/checkout` | POST | token = capability; tenant read via token row |
| `quotes/[id]` | GET / PATCH / DELETE | tenant-scoped |
| `quotes/[id]/send` | POST | tenant-scoped |
| `quotes/[id]/convert` | POST | tenant-scoped quote read; client/booking writes tenant-tagged |
| `quotes/[id]/convert-to-job` | POST | `convertSaleToJob(tenantId, …)` — tenant threaded |
| `quotes/public/[token]/accept` | POST | token-gated; deal writes `.eq('tenant_id', quote.tenant_id)` |
| `quotes/public/[token]/deposit-checkout` | POST | token-gated; Stripe metadata carries tenant_id |
| `quotes/public/[token]/decline` | POST | token-gated |
| `payments/link` | POST | tenant-scoped booking read |
| `payments/checkout` | POST | tenant-scoped booking read |
| `bookings/[id]/payment` | PATCH | `.eq('id').eq('tenant_id')` on the update |
| `jobs/[id]` | GET / PATCH | tenant-scoped job gate |
| `jobs/[id]/payments` | PATCH | `.eq('tenant_id').eq('job_id').eq('id')` on the update |
| `admin/payments/confirm-match` | POST | both `unmatched_payments` and `bookings` reads tenant-scoped |
| `admin/payments/finalize-match` | POST | internal-key gated; tenant resolved from booking |
| `admin/billing` | GET / PUT | `requireAdmin()` — platform super-admin, cross-tenant by design |
| `admin/requests/[id]/proposal-checkout` | POST | `requireAdmin()` — pre-tenant lead, by design |
| `team-portal/checkout` | POST | signed team token; booking read tenant + `team_member_id` scoped |

## Residual observations (defense-in-depth — NOT live leaks, ranked)

None of these are exploitable today; each is protected by a preceding tenant-scoped
404 gate. They are listed because a future refactor that weakens the parent gate would
turn them into leaks.

### R1 — MEDIUM (defense-in-depth): child reads in GET routes omit tenant scope
`invoices/[id]` GET fetches `invoice_activity` and `payments` by `invoice_id` only;
`quotes/[id]` GET fetches `quote_activity` by `quote_id` only; `jobs/[id]` GET fetches
`job_payments` / `bookings` / `job_events` by `job_id` only.
Safe **only** because the parent `invoices/quotes/jobs` `.single()` is tenant-scoped and
404s first. Not exploitable. Recommendation: add `.eq('tenant_id', tenantId)` to the child
selects too, so the gate is not load-bearing across a refactor.
- `src/app/api/invoices/[id]/route.ts:30-41`
- `src/app/api/quotes/[id]/route.ts:24-29`
- `src/app/api/jobs/[id]/route.ts:35-45`

### R2 — LOW (defense-in-depth): recompute subqueries fetch by id only
`invoices/[id]` PATCH and `quotes/[id]` PATCH re-read `line_items/tax/discount` (and quote
`total_cents`) with `.eq('id', id)` and no tenant. Gated by the tenant-scoped `existing`
read earlier in the same handler, so the id is already proven tenant-owned. Redundant but
safe. Recommendation: add tenant scope for consistency.
- `src/app/api/invoices/[id]/route.ts:80-84`
- `src/app/api/quotes/[id]/route.ts:66-70`, `:97-100`

### R3 — LOW (defense-in-depth): post-trigger refetch by id only
`invoices/[id]/record-payment` re-reads the invoice `.eq('id', id)` (no tenant) after the
DB trigger recomputes status. Gated by the tenant-scoped invoice read above it. Safe.
- `src/app/api/invoices/[id]/record-payment/route.ts` (re-fetch block)

## Note for the leader

This is a clean negative for the billing surface — the finance layer's tenant scoping is
consistent and the auth base is cryptographically bound. The W4 class does not reproduce
here. R1 is the only item I'd suggest hardening (cheap, one `.eq` per child select) and is
a follow-up, not a blocker. No route edits were made (standing rule: flag before editing).
