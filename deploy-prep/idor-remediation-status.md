# IDOR remediation status — the 38 by-id reads on tenant-scoped tables

**Author:** W4 (verification-harness lane) · **Date:** 2026-07-12
**Source:** `deploy-prep/idor-scan-note.md` (the 498-route sweep). This file is the
**status tracker** for that scan: every triaged read carries a disposition
(**FIXED** / **SAFE** / **NEEDS-FIX**) plus its evidence and test coverage.

Bug class recap: a cross-tenant read IDOR requires all three — (1) a
**per-tenant** auth boundary, (2) a **caller-supplied** lookup key, (3) **no**
`tenant_id`/ownership scope on the read. Items failing (1) (super-admin,
monitor) or (2)/(no tenant principal) (webhooks, cron, token flows) are a
different class and are tracked here as **SAFE — not this class**, not as leaks.

> All reads use `supabaseAdmin` (service role, RLS bypassed). Application-code
> `.eq('tenant_id')` is the **sole** isolation boundary — that is why each of
> these matters even though RLS "exists."

## Disposition legend

| Status | Meaning |
|--------|---------|
| **FIXED** | Was a live leak; route now scoped; regression-locked. |
| **SAFE** | Not exploitable as tenant-vs-tenant IDOR (by design, guarded, or no tenant principal). |
| **NEEDS-FIX** | Not a live read-leak today, but a real hardening gap that must close before tenant #2 GA. |

## Rollup

| Disposition | Count (reads) | Deploy-gate impact |
|-------------|---------------|--------------------|
| FIXED | 1 | Cleared (Jeff-gated deploy — PR #15). |
| NEEDS-FIX | 2 | **Not** single-tenant blockers; **must** close before onboarding tenant #2. |
| SAFE — guarded (fragile) | 1 | Regression-locked; harden at refactor. |
| SAFE — by design / no-tenant-principal / row-scoped / token-flow | ~34 | No action. |

Count note (honesty): the scan reported **38 reads across 26 files**. The source
grouped several buckets (webhooks, cron, super-admin) by endpoint rather than
enumerating every individual `.select()`, so the per-read tally below reconciles
to **~36–38** depending on how multi-read handlers are counted (e.g. telnyx
touches 4 tables in one handler). No item changes disposition under either
count. The three line-audited items (P0/P1/P2) are exact; the SAFE buckets were
classified by auth type + key provenance (see scan-note caveats).

---

## FIXED (1)

| # | Endpoint → table | Evidence | Test |
|---|------------------|----------|------|
| 1 | `GET /api/selena?convoId` → `sms_conversation_messages` | `.eq('tenant_id', tenantId)` added in **722ed11d** (PR #15, awaiting Jeff). col exists mig 010, backfilled NOT NULL by `2026_05_09_tenant_id_core.sql`. | `selena/route.convoid-cross-tenant.witness.test.ts` — NEGATIVE + POSITIVE control; proven RED→GREEN by reverting the fix. |

## NEEDS-FIX (2)

| # | Location → table | Gap | Test / next action |
|---|------------------|-----|--------------------|
| 3 | `POST /api/selena` reset insert → `sms_conversation_messages` (`route.ts:171`) | Recovery message inserted **without** `tenant_id`; falls back to DEFAULT `'nycmaid'`. Benign today (single tenant); for tenant #2 the row mis-tags `nycmaid` → the now-scoped `GET ?convoId` **hides that tenant's own message** (self-visibility bug, not disclosure). Inline comment "tenant-scope-ok: row-scoped by conversation_id" is about write-integrity, not the row's own tag. | **Witnessed** (not yet fixed — read-only lane): `selena/route.reset-insert-tenant-tag.witness.test.ts` (`it.fails` on the missing `tenant_id`, + POSITIVE that the parent convo IS tagged). **Fix:** add `tenant_id: tenantId` to the insert, then convert the witness to a plain `it`. Route edit is **leader/Jeff-gated**. |
| — | (write-side siblings) any other `sms_conversation_messages` / scoped-table insert leaning on the column DEFAULT | Same mis-tag risk class. Not individually swept (scanner keys on `.select`, not `.insert`). | Recommend an insert-side pass before tenant #2 (out of this lane's read scope). |

## SAFE — guarded but fragile (1)

| # | Endpoint → table | Why safe today | Test |
|---|------------------|----------------|------|
| 2 | `GET /api/sms?conversation_id` → `sms_conversation_messages` (`route.ts:16`) | Messages fetched by `conversation_id` first, but a follow-up `sms_conversations` read scoped `.eq('id',convoId).eq('tenant_id',tenantId).single()` returns **404** before messages are emitted. Guard sits **after** the fetch, blocks only the `return`. | **Regression-locked**: `sms/route.cross-tenant.test.ts` — NEGATIVE (cross-tenant→404, no PII) + POSITIVE. Mutation-verified: removing the 404 guard flips NEGATIVE red. **Harden** at any refactor: scope the messages read itself. |

---

## SAFE — not this bug class (~34)

### Cross-tenant BY DESIGN — platform super-admin (`requireAdmin` → `verifyAdminToken`, global `super_admin` token only; tenant-admin tokens rejected)
| Endpoint | Tables read by id |
|----------|-------------------|
| `admin/bookings/[id]/closeout-summary` | `payments`, `sms_logs` (by `booking_id`) |
| `admin/schedule-issues/fix` | `bookings`, `schedule_issues` (by `id`) |
| `admin/comhub/contacts/[id]/context` | `clients` (by `id`) |
| `admin/comhub/voice/settings` | `comhub_admin_voice_settings` (by `admin_id`) |

Coverage: super-admin token boundary regression-locked elsewhere
(`require-admin.isolation.test.ts`, `admin-auth/admin-token-verify.isolation.test.ts`).

### Cross-tenant BY DESIGN — platform monitoring bearer key (`ELCHAPO_MONITOR_KEY`, platform-wide by spec; optional `?tenant=` ownership check)
| Endpoint | Table |
|----------|-------|
| `admin/selena/monitor` | `sms_conversation_messages` (by `conversation_id`) |

### No authenticated tenant — webhooks (provider-supplied external ids are how the tenant is *resolved*, not an escalation vector)
| Endpoint | Tables |
|----------|--------|
| `webhooks/stripe` | `payments` (by `stripe_session_id`) — cross-tenant-refund isolation covered by `webhooks/stripe/route.cross-tenant-refund.isolation.test.ts` |
| `webhooks/telnyx` | `campaign_recipients`, `clients`, `bookings`, `sms_conversation_messages` |
| `webhooks/resend` | `campaign_recipients` (by `resend_email_id` / `campaign_id`) — `webhooks/resend/route.isolation.test.ts` |

### No authenticated tenant — cron (ids are system-derived from prior tenant-scoped queries; globally-unique ids keep counts correct)
`cron/comhub-email`, `cron/daily-summary`, `cron/generate-recurring`, `cron/payment-followup-daily`

### Row-scoped-ok — lookup key derived from an already-tenant-validated parent or verified token (line-audited)
| Location | Why safe | Added test coverage |
|----------|----------|---------------------|
| `selena/route.ts` message-COUNT loop | `c.id` iterates conversations already `.eq('tenant_id',tenantId)` | — |
| `admin/selena/route.ts` | `getTenantForRequest`; counts over tenant-scoped convos | — |
| `campaigns/send` | `requirePermission('campaigns.create')`; `campaigns` loaded `.eq('tenant_id',tenantId)` before any `campaign_recipients` read | — |
| `invoices/[id]` | `requirePermission('finance.view')`; invoice `.eq('tenant_id',tenantId).single()` (404-gates) before `payments` read | W1 billing-idor-audit = clean negative |
| **`jobs/[id]`** | `getTenantForRequest`; `jobs` `.eq('tenant_id',tenantId).eq('id',id).single()` 404-gate before child `bookings`/`job_payments`/`job_events` | **NEW regression lock** `jobs/[id]/route.cross-tenant.test.ts` — NEGATIVE (404, no `job_payments` query, no money) + POSITIVE. Same fragility class as sms #2. |
| `jobs/[id]/sessions/[sessionId]` | `loadOwnedSession(tenantId, jobId, sessionId)` enforces `.eq('id').eq('tenant_id')` + job match before id-only re-read | — |
| `portal/messages`, `team-portal/messages` | `thread_id` derived from authenticated `clientId` / verified field-staff token, never caller-supplied | `team-portal/messages/messages-authz.isolation.test.ts` |

### Public / auth-establishment flows (no tenant-vs-tenant boundary; classified by auth type + key provenance, not exhaustively line-audited)
`client/confirm/[token]`, `portal/auth`, `portal/connect`, `referrers/[code]`, `track`

---

## Deploy-gate summary

- **P0 (#1)** — FIXED, tested, committed; deploy stays **Jeff-gated** (PR #15).
- **P1 (#2)** — SAFE for single-tenant; regression-locked; harden at refactor.
- **P2 (#3)** — NEEDS-FIX before **tenant #2**; witnessed, route edit leader/Jeff-gated. **Not** a single-tenant (nycmaid) blocker.
- Everything else — SAFE (not this class). No blockers introduced.

## Caveats carried forward (from the scan)

- Scanner keys on `supabaseAdmin.from(t).select().eq('*_id')`. **Not** swept:
  `.rpc()`/DB functions, `.in()`/`.or()`/`.match()`/`.filter()`, dynamic table
  names, ORM wrappers — and **write-side** (`.insert`/`.update`) tenant tagging
  (P2 was found by line-reading the selena reset, not by the scanner).
- SAFE buckets below the P0/P1/P2 line were classified by auth type + key
  provenance, not a full line-audit of every handler (except `jobs/[id]`, now
  line-audited + locked here).
